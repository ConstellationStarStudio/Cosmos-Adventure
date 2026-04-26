import { world, system, BlockPermutation} from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils"
import { get_data } from "../machines/Machine";
import { side_blocks } from "../blocks/fluid_pipe";

//finds fluid_storage entity in pipes networks and loads fluid from there
export function get_fluid_amount(machine, fluid_data, amount){
    const data = get_data(machine);
    const fluid_type = fluid_data.type;
    const slot = fluid_data.slot;
    const space = data[slot].capacity - amount; 

    let storage_object = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');
    let fluid_storage = storage_object?.input?.[fluid_type];
    storage_object = storage_object ? storage_object: {};
    storage_object.input = storage_object?.input ? storage_object.input: {}; 

    if(fluid_storage) {
        let machine_entity = (machine.id == fluid_storage.id)? machine: world.getEntity(fluid_storage.id);
        let fluid_object = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        let fluid = fluid_object[fluid_storage.side];
        fluid = fluid?.[fluid_type];
        if(!fluid || fluid.amount == 0) return amount;
        amount += Math.min(fluid.amount, space, 10000); 
        fluid.amount -= Math.min(10000, fluid.amount, space);
        save_dynamic_object(machine_entity, fluid_object, 'machine_data', 'fluid_storage_amount');
        return amount;
    }

    let machines = JSON.parse(machine.getDynamicProperty("fluid_system") ?? '{}');
    
    fluid_storage = fluid_storage ?? {};

    let inputs = machines?.found_machines?.[slot]?.input ?? [];

    for(let storage of [[machine.id, undefined], ...inputs]){
        let machine_entity = world.getEntity(storage[0]); 
        if(!machine_entity?.isValid) continue;

        let fluid_object = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        //(machine.id == machine_entity.id)? "input": storage[1][slot][0]
        let machine_slot = (machine.id == machine_entity.id)? "input": storage[1][slot][0];
        let fluid = fluid_object?.[machine_slot]?.[fluid_type];

        if(fluid){
            fluid_storage.id = machine_entity.id;
            fluid_storage.side = machine_slot;
            fluid_storage.slot = fluid.slot;
            amount += Math.min(fluid.amount, space, 10000);
            fluid.amount -= Math.min(10000, fluid.amount, space);
            storage_object.input = storage_object?.input ?? {};
            storage_object.input[fluid_type] = fluid_storage; 
            save_dynamic_object(machine, storage_object, 'machine_data', 'fluid_storage_entity');
            save_dynamic_object(machine_entity, fluid_object, 'machine_data', 'fluid_storage_amount');
            return amount;
        }
    }
    return amount;
}

export function save_fluid_amount(machine, fluid_data, pipe, amount){
    let storage_object = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');
    if(storage_object && storage_object?.output?.["unknown"]) return amount;

    const fluid_type = fluid_data.type;
    const slot = fluid_data.slot;

    let fluid_storage = storage_object?.output?.[fluid_type];
    storage_object = storage_object ?? {};
    storage_object.output = storage_object?.output ?? {};

    let machines = JSON.parse(machine.getDynamicProperty("fluid_system") ?? '{}');
    let max_space = (machines?.pipe_count?.output[slot] ?? 0) * 200;

    if(fluid_storage){
        let machine_entity = (machine.id == fluid_storage.id)? machine: world.getEntity(fluid_storage.id);
        let fluid_object = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        let fluid = fluid_object?.[fluid_storage.side]?.[fluid_type];
        if(fluid !== undefined){
            let fluid_in_pipes = pipes_fluid_amount(fluid, amount, max_space);
            fluid = fluid_in_pipes.fluid;

            save_dynamic_object(machine_entity, fluid_object, 'machine_data', 'fluid_storage_amount');
            
            if(machine.id == fluid_storage.id && /cosmos:fluid_pipe/.test(pipe.typeId)){
                let state = pipe.typeId.replace("cosmos:fluid_pipe_", '');
                if(fluid.amount > 0 && state != fluid_type) system.runJob(update_fluid(pipe, fluid_type));
                else if(fluid.amount === 0 && pipe.typeId != "cosmos:fluid_pipe"){
                    const old_type = pipe.typeId;
                    system.runTimeout(() => {
                        let new_pipe = machine.dimension.getBlock(pipe.location);
                        if(!machine_entity.isValid || new_pipe.typeId == "cosmos:fluid_pipe" || new_pipe.typeId != old_type) return;
                        let new_fluid = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount'); 
                        if(!new_fluid[fluid_type] || new_fluid[fluid_type].amount === 0) system.runJob(update_fluid(pipe, "empty"))
                    }, 21);
                }
            }
            return fluid_in_pipes.amount;
        }else if(fluid_object?.output && Object.keys(fluid_object.output).length > 0){
            return amount;
        }
    }

    let outputs = machines?.found_machines?.[slot]?.output ?? [];
    for(let output of outputs){
        let machine_entity = world.getEntity(output[0]); 
        let machine_slot = output[1][slot][0];

        let fluid_object = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        let fluid = fluid_object?.[machine_slot]?.[fluid_type];

        if(fluid !== undefined){
            let fluid_in_pipes = pipes_fluid_amount(fluid, amount, max_space);

            fluid = fluid_in_pipes.fluid;
            fluid_storage = {id: machine_entity.id, side: machine_slot};
            storage_object.output[fluid_type] = fluid_storage;

            save_dynamic_object(machine, storage_object, 'machine_data', 'fluid_storage_entity');
            save_dynamic_object(machine, fluid_object, 'machine_data', 'fluid_storage_amount');

            return fluid_in_pipes.amount;
        }else if(Object.keys(storage_object?.output ?? {}).length > 0){
            storage_object.output["unknown"] = machine_entity.id;
            save_dynamic_object(machine, storage_object, 'machine_data', 'fluid_storage_entity');
            return amount;
        }
    }
    
    storage_object.output[fluid_type] = {id: machine.id, side: "output"};

    let fluid_object = load_dynamic_object(machine, 'machine_data', 'fluid_storage_amount');
    fluid_object = fluid_object ?? {};
    fluid_object.output = fluid_object.output ?? {};

    fluid_object.output[fluid_type] = {};
    fluid_object.output[fluid_type].amount = 0;
    fluid_object.output[fluid_type].slot = slot;

    let fluid_in_pipes = pipes_fluid_amount(fluid_object.output[fluid_type], amount, max_space)
    fluid_object.output[fluid_type] = fluid_in_pipes.fluid;

    save_dynamic_object(machine, storage_object, 'machine_data', 'fluid_storage_entity');
    save_dynamic_object(machine, fluid_object, 'machine_data', 'fluid_storage_amount');

    return fluid_in_pipes.amount;
}

function pipes_fluid_amount(fluid, amount, max_space){
    fluid.amount = Math.min(fluid.amount, max_space);
    const space = Math.min(amount, max_space - fluid.amount);
    fluid.amount += Math.min(amount, space);
    amount -= Math.min(amount, space);
    return {fluid, amount}
}

export function update_network(storage, fluid, old_list, new_list){
    if(!fluid || Object.keys(fluid.input ?? {}).length === 0) return;
    
    let disconnected_machines = compare_lists(old_list, new_list);
    if(!Object.keys(disconnected_machines ?? {}).length) return;
    
    for(let machine of Object.entries(fluid.input)){
        let slot = disconnected_machines[machine[1].id]?.[machine[0]]?.input?.[machine[1].slot];
        if(slot?.includes(machine[1].side)){
            delete fluid.input[machine[0]];
        }
    }

    save_dynamic_object(storage, fluid, "machine_data", "fluid_storage_entity");
}

function compare_lists(old_list, new_list){
    let disconnected_machines = {}; 
    let old_sides = old_list.found_machines ?? {};
    let new_sides = new_list.found_machines ?? {};

    for(let slot of Object.entries(old_sides)){
        for(let side in slot[1]){
            for(let machine of slot[1][side]){
                let machine_id = machine[0];
                let similliar_machine = new_sides[slot[0]]?.[side]?.find(element => element[0] == machine_id);
                let machine_in_list = disconnected_machines[machine[0]]?.[slot[0]] ?? {};

                
                Object.entries(machine[1]).forEach((old_slot) => {
                    if(!similliar_machine){
                        let machine_slot = {[old_slot[0]]: old_slot[1]}
                        machine_in_list[slot[0]] = {[side]: machine_slot};
                        disconnected_machines[machine[0]] = machine_in_list;
                        return;
                    }

                    let disconnected_sides = [];
                    old_slot[1].forEach((old_side) => {
                        if(!similliar_machine[1][old_slot[0]]?.includes(old_side)) disconnected_sides.push(old_side);
                    });
                    if(disconnected_sides.length){
                        machine_in_list[old_slot[0]] = {[side]: disconnected_sides};
                        disconnected_machines[machine[0]] = disconnected_machines[machine[0]] ?? {};
                        disconnected_machines[machine[0]][side] = machine_in_list;
                        return;
                    }
                });
            }
        }
    }
    return disconnected_machines;
}

function get_sides(pipe, updated_pipes){
    let sides = pipe.permutation.getAllStates();
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
//updates visual part of pipes
export function* update_fluid(pipe, fluid){
    let updated_pipes = [];
    let pipes_to_update = [];
    const new_type = (fluid == "empty")? "cosmos:fluid_pipe" : "cosmos:fluid_pipe" + "_" + fluid;
    pipes_to_update = get_sides(pipe, updated_pipes);
    pipe.setPermutation(BlockPermutation.resolve(new_type, pipe.permutation.getAllStates()))

    for(let i = 0; i < pipes_to_update.length; i++){
        let block = pipes_to_update[i];
        updated_pipes.push(JSON.stringify({x: block.x, y: block.y, z: block.z}));
        let new_pipe = pipe.dimension.getBlock(block);
        if(new_pipe && !new_pipe.isAir && /cosmos:fluid_pipe/.test(new_pipe.typeId)){
            pipes_to_update = [...pipes_to_update, ...get_sides(new_pipe, updated_pipes)]
            new_pipe.setPermutation(BlockPermutation.resolve(new_type, new_pipe.permutation.getAllStates()));
            yield;
        }
    }

}