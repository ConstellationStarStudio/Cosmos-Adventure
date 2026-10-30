import { world, system, BlockPermutation} from "@minecraft/server"
import { side_blocks, update_pipe_network} from "../blocks/fluid_pipe";

export let fluid_network = {}
system.run(() => {fluid_network = JSON.parse(world.getDynamicProperty("fluid_network") ?? "{}")});

export function create_network(pipe, type, liquid_type, fluid_amount){
    let network_ids = Object.keys(fluid_network);
    let last_id = network_ids.at(-1) ?? 0;
    let new_id = parseInt(last_id) + 1;
    pipe.getComponent("minecraft:dynamic_properties").set("network_id", new_id);
    fluid_network[new_id] = {type};
    let info = update_pipe_network(pipe, new_id);
    
    let space = info[0] * 200;
    let capacity = Math.min(space, fluid_amount);
    fluid_amount -= capacity;

    //t is type, p is number of pipes, c is capacity, i is for input machines, o for output, is extracted
    fluid_network[new_id] = {t: type, p: info[0], c: capacity, i: info[1], o: info[2], l: liquid_type, e: false};
    save_network();
    return fluid_amount;
}

export function refresh_network(pipe, id, perm = pipe.permutation){
    let info = update_pipe_network(pipe, id, perm);
    if(id && fluid_network[id]){
        fluid_network[id].p = info[0];
        fluid_network[id].i = info[1];
        fluid_network[id].o = info[2];
        fluid_network[id].c = Math.min(fluid_network[id].c, info[0] * 200);
        fluid_network[id].e = false;
    }
    save_network();
}

export function save_network(){
    world.setDynamicProperty("fluid_network", JSON.stringify(fluid_network));
}


export const fluid_tick_component = {
    onTick({block}) {
        let network_id = block.getComponent("minecraft:dynamic_properties").get("network_id")
        let network = fluid_network[network_id];
        if(!network){
            block.setPermutation(block.permutation.withState("cosmos:tick", false));
            try{block.getComponent("minecraft:dynamic_properties").set("dirty_check", undefined);}
            catch(undefined){}
            return;
        }
        if(network.o === 0 && network.c === 0){
            refresh_network(block, undefined);
            block.setPermutation(block.permutation.withState("cosmos:tick", false));
            try{block.getComponent("minecraft:dynamic_properties").set("dirty_check", undefined)}
            catch(undefined){}
            return;
        }

        let dirty = block.getComponent("minecraft:dynamic_properties").get("dirty_check");
        
        if(dirty && network.c === 0 && !network.e){
            system.runJob(update_fluid(block, "empty", "l"));
            block.getComponent("minecraft:dynamic_properties").set("dirty_check", false);
        }else if(!dirty && (network.c > 0 || network.e)){
            system.runJob(update_fluid(block, network.t, network.l));
            block.getComponent("minecraft:dynamic_properties").set("dirty_check", true);
        }
    },
}
//updates visual part of pipes
export function* update_fluid(pipe, fluid, liquid_type, perm = pipe.permutation){
    //i don't just stringify block.location because once there was a minecraft bug that caused vector string have reversed xyz so it zyx in string
    let updated_pipes = [JSON.stringify({x: pipe.location.x, y: pipe.location.y, z: pipe.location.z})];
    let pipes_to_update = [];
    let new_liquid_type = liquid_type == "l"? "liquid": "gas";

    const new_type = (fluid == "empty")? "cosmos:fluid_pipe" : "cosmos:fluid_pipe" + "_" + fluid;
    pipes_to_update = get_sides(pipe, updated_pipes, perm);

    if(!pipe.isAir){
        let type_to_set = pipe.hasTag("sealed_fluid_pipe") ? pipe.typeId: new_type;
        let perm_to_set = pipe.permutation.getAllStates();
        perm_to_set["cosmos:liquid"] = new_liquid_type;
        perm_to_set = BlockPermutation.resolve(type_to_set, perm_to_set);

        let dynamic_properties = pipe.getComponent("minecraft:dynamic_properties");
        let id = dynamic_properties.get("network_id");
        let dirty_check = dynamic_properties.get("dirty_check");

        pipe.setPermutation(perm_to_set);
        //saving old dynamic properties because they are deleted if pipe have a new type
        //dirty check is saved only here because you don't need to save them in other blocks in network
        dynamic_properties = pipe.getComponent("minecraft:dynamic_properties");
        if(id) dynamic_properties.set("network_id", id);
        if(dirty_check) dynamic_properties.set("dirty_check", dirty_check);
    }

    for(let i = 0; i < pipes_to_update.length; i++){
        let block = pipes_to_update[i];
        updated_pipes.push(JSON.stringify({x: block.x, y: block.y, z: block.z}));
        let new_pipe = pipe.dimension.getBlock(block);
        if(new_pipe && !new_pipe.isAir && new_pipe.hasTag("fluid_pipe")){
            pipes_to_update = [...pipes_to_update, ...get_sides(new_pipe, updated_pipes)]
            let id = new_pipe.getComponent("minecraft:dynamic_properties").get("network_id");
            let type_to_set = new_pipe.hasTag("sealed_fluid_pipe") ? new_pipe.typeId: new_type;

            let new_perm = new_pipe.permutation.getAllStates();
            new_perm["cosmos:liquid"] = new_liquid_type;
            new_perm = BlockPermutation.resolve(type_to_set, new_perm);
            new_pipe.setPermutation(new_perm); 
            if(id) new_pipe.getComponent("minecraft:dynamic_properties").set("network_id", id)
            yield;
        }
    }

}
function get_sides(pipe, updated_pipes, perm = pipe.permutation){
    let sides = perm.getAllStates();
	let loc = pipe.location;
	let blocks = side_blocks(loc);
    let pipes = [];
    for(let side in sides){
        if(!sides[side] || !blocks[side]) continue;
        let block = blocks[side];
        if(updated_pipes.includes(JSON.stringify({x: block.x, y: block.y, z: block.z}))) continue;
        pipes.push(block);
    }
    return pipes;
}