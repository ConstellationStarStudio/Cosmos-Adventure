import { world, system, BlockPermutation} from "@minecraft/server"
import { side_blocks, update_pipe_network} from "../blocks/fluid_pipe";

export let fluid_network = {}
system.run(() => {fluid_network = JSON.parse(world.getDynamicProperty("fluid_network") ?? "{}")});

export function create_network(pipe, type, fluid_amount){
    let network_ids = Object.keys(fluid_network);
    let last_id = network_ids.at(-1) ?? 0;
    let new_id = parseInt(last_id) + 1;
    world.setDynamicProperty(JSON.stringify(pipe.location), new_id);
    fluid_network[new_id] = {type};
    let info = update_pipe_network(pipe, new_id);
    
    let space = info[0] * 200;
    let capacity = Math.min(space, fluid_amount);
    fluid_amount -= capacity;

    //t is type, p is number of pipes, c is capacity, i is for input machines, o for output, is extracted
    fluid_network[new_id] = {t: type, p: info[0], c: capacity, i: info[1], o: info[2], e: false};
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
        let network_id = world.getDynamicProperty(JSON.stringify(block.location));
        let network = fluid_network[network_id];
        if(!network){
            block.setPermutation(block.permutation.withState("cosmos:tick", false));
            return;
        }

        let fluid_type = block.typeId.replace("cosmos:fluid_pipe_", '');
        fluid_type = (fluid_type == "cosmos:fluid_pipe")? undefined: fluid_type;

        if(network.o === 0 && network.c === 0){
            refresh_network(block, undefined);
            block.setPermutation(block.permutation.withState("cosmos:tick", false));
            return;
        }
        if(fluid_type && network.c === 0 && !network.e){
            system.runJob(update_fluid(block, "empty"));
        }else if(!fluid_type && (network.c > 0 || network.e)){
            system.runJob(update_fluid(block, network.t));
        }
    },
}
//updates visual part of pipes
export function* update_fluid(pipe, fluid, perm = pipe.permutation){
    let updated_pipes = [];
    let pipes_to_update = [];
    const new_type = (fluid == "empty")? "cosmos:fluid_pipe" : "cosmos:fluid_pipe" + "_" + fluid;
    pipes_to_update = get_sides(pipe, updated_pipes, perm);
    if(!pipe.isAir) pipe.setPermutation(BlockPermutation.resolve(new_type, pipe.permutation.getAllStates()))

    for(let i = 0; i < pipes_to_update.length; i++){
        let block = pipes_to_update[i];
        updated_pipes.push(JSON.stringify({x: block.x, y: block.y, z: block.z}));
        let new_pipe = pipe.dimension.getBlock(block);
        if(new_pipe && !new_pipe.isAir && new_pipe.hasTag("fluid_pipe")){
            pipes_to_update = [...pipes_to_update, ...get_sides(new_pipe, updated_pipes)]
            new_pipe.setPermutation(BlockPermutation.resolve(new_type, new_pipe.permutation.getAllStates()));
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