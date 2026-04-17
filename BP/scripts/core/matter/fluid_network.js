import { world, system, BlockPermutation} from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils"
import { get_data } from "../machines/Machine";
import { side_blocks } from "../blocks/fluid_pipe";

//finds fluid_storage entity in pipes networks and loads fluid from there
export function get_fluid_amount(machine, fluid_data, amount){
    const data = get_data(machine);
    const fluid_type = fluid_data.type;
    const slot = fluid_data.slot;
    const space = data[slot].capacity - fluid; 

    let storage_object = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');
    let fluid_storage = storage_object?.[fluid_type]

    if(fluid_storage) {
        let machine_entity = (machine.id == fluid_storage)? machine: world.getEntity(fluid_storage);

        let fluid_object = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        let fluid = fluid_object?.[fluid_type] ?? 0;

        if(fluid == 0) return fluid;

        fluid.amount -= Math.min(100, fluid.amount, space);

        save_dynamic_object(machine_entity, fluid_amount, 'machine_data', 'fluid_storage_amount');
        return amount + Math.min(fluid.amount, space, 100);
    }

    let machines = JSON.parse(machine.getDynamicProperty("fluid_system") ?? '{}');
    
    fluid_storage = fluid_storage ?? {};

    const inputs = (machines.input ? machines.input[slot] : []) ?? [];

    for(let storage of [[machine.id, undefined], ...inputs]){
        let machine_entity = world.getEntity(storage[0]); 
        if(!machine_entity?.isValid) continue;

        let fluid_object = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        let fluid = fluid_object?.[fluid_type] ?? 0;

        if(fluid){
            fluid_storage = machine_entity.id;
            amount += Math.min(fluid.amount, space, 100);
            fluid.amount -= Math.min(100, fluid.amount, space);

            save_dynamic_object(machine, storage_object, 'machine_data', 'fluid_storage_entity');
            save_dynamic_object(machine_entity, fluid_object, 'machine_data', 'fluid_storage_amount');
            return amount;
        }
    }
    return amount;
}

export function save_fluid_amount(machine, fluid_data, pipe, amount){
    let storage_object = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');
    if(storage_object && storage_object["unknown"]) return amount;

    const fluid_type = fluid_data.type;
    const slot = fluid_data.slot;

    let fluid_storage = storage_object?.[fluid_type];
    storage_object = storage_object ?? {};

    let machines = JSON.parse(machine.getDynamicProperty("fluid_system") ?? '{}');
    let max_space = (machines?.pipe_count?.output[slot] ?? 0) * 200;

    if(fluid_storage){
        let machine_entity = (machine.id == fluid_storage)? machine: world.getEntity(fluid_storage);

        let fluid_object = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        let fluid = fluid_object?.[fluid_type];

        if(fluid !== undefined){
            let fluid_in_pipes = pipes_fluid_amount(fluid, amount, max_space);
            fluid = fluid_in_pipes.fluid;

            save_dynamic_object(machine_entity, fluid_object, 'machine_data', 'fluid_storage_amount');
            
            if(machine.id == fluid_storage && /cosmos:fluid_pipe/.test(pipe.typeId)){
                let state = pipe.typeId.replace("cosmos:fluid_pipe_", '');
                if(fluid.amount > 0 && state != fluid_type) system.runJob(update_fluid(pipe, fluid_type));
                else if(fluid[fluid_type].amount === 0 && pipe.typeId != "cosmos:fluid_pipe"){
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
        }else if(fluid_object && Object.keys(fluid_object).length > 0){
            return amount;
        }
    }

    if(machines.output){
        for(let output of machines.output[slot]){
            let machine_entity = world.getEntity(output[0]); 
            let fluid_object = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
            let fluid = fluid_object?.[fluid_type];

            if(fluid !== undefined){
                let fluid_in_pipes = pipes_fluid_amount(fluid, amount, max_space);

                fluid = fluid_in_pipes.fluid;
                fluid.slot = slot;
                fluid_storage = machine_entity.id;

                save_dynamic_object(machine, storage_object, 'machine_data', 'fluid_storage_entity');
                save_dynamic_object(machine, fluid_object, 'machine_data', 'fluid_storage_amount');

                return fluid_in_pipes.amount;
            }else if(Object.keys(all_saved_fluid_types ?? {}).length > 0){
                storage_object["unknown"] = machine_entity.id;
                save_dynamic_object(machine, storage_object, 'machine_data', 'fluid_storage_entity');
                return amount;
            }
        }
    }

    storage_object[fluid_type] = machine.id;

    let fluid_object = {}
    fluid_object[fluid_type] = {};
    fluid_object[fluid_type].amount = 0;
    fluid_object[fluid_type].slot = slot;

    let fluid_in_pipes = pipes_fluid_amount(fluid_object[fluid_type], amount, max_space)
    fluid_object[fluid_type] = fluid_in_pipes.fluid;

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

export function update_network(storage, old_list, new_list){
    let fluid = load_dynamic_object(storage, 'machine_data', 'fluid_storage_amount');
    if(!fluid || Object.keys(fluid).length === 0) return;
    if(JSON.stringify(old_list) == JSON.stringify(new_list)){
        return;
    }
    let deleted_machines = compare_lists(old_list, new_list);
    if(deleted_machines.input.length + deleted_machines.output.length === 0) return;

    for(let type in fluid){
        const slot = fluid[type].slot;
        const inputs = (old_list.input ? old_list.input[slot] : []) ?? [];
        const outputs = (old_list.output ? old_list.output[slot] : []) ?? [];

        for(let machine of [[storage.id, undefined], ...outputs, ...inputs]){
            let machine_entity = world.getEntity(machine[0]);
            if(!machine_entity || !machine_entity.isValid) continue;
            let fluid_entity = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_entity');
            let fluid_amount = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
            if(fluid_entity[type] == storage.id){
                delete fluid_entity[type];
                if(!Object.keys(fluid_entity).length) fluid_entity = undefined;
                save_dynamic_object(machine_entity, fluid_entity, 'machine_data', 'fluid_storage_entity')
            } 
            if(fluid_amount[type]){
                delete fluid_amount[type];
                if(!Object.keys(fluid_amount).length) fluid_amount = undefined;
                save_dynamic_object(machine_entity, fluid_amount, 'machine_data', 'fluid_storage_amount')
            }
        }
    }
    
}
export function delete_storage(storage){
    let fluid = load_dynamic_object(storage, 'machine_data', 'fluid_storage_amount');
    if(!fluid || Object.keys(fluid) === 0) return;

    let machines = JSON.parse(storage.getDynamicProperty("fluid_system") ?? "{}");
    for(let type in fluid){
        const slot = fluid[type].slot;
        let is_done = false;
        const inputs = (machines.input ? machines.input[slot] : []) ?? [];
        const outputs = (machines.output ? machines.output[slot] : []) ?? [];

        for(let machine of [...inputs, ...outputs]){
            let machine_entity = world.getEntity(machine[0]);
            if(!machine_entity || !machine_entity.isValid) continue;

            let fluid_entity = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_entity');
            if(fluid_entity[type] == storage.id){
                let new_fluid_entity = {... fluid_entity[type]}
                delete new_fluid_entity[type];
                if(!Object.keys(new_fluid_entity).length) new_fluid_entity = undefined;
                save_dynamic_object(machine_entity, new_fluid_entity, 'machine_data', 'fluid_storage_entity')
            }
            if(is_done) continue;
            let fluid_amount = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
            fluid_amount = (fluid_amount)? fluid_amount: {};
            if(fluid_amount[type] !== undefined){
                fluid_amount[type].amount += fluid[type].amount;
                save_dynamic_object(machine_entity, fluid_amount, 'machine_data', 'fluid_storage_amount');
            }else{
                fluid_amount[type] = {};
                fluid_amount[type].amount = fluid[type].amount;
                fluid_amount[type].slot = slot;
                save_dynamic_object(machine_entity, fluid_amount, 'machine_data', 'fluid_storage_amount');
            }
            is_done = true;
        }
    }
}
function compare_lists(old_list, new_list){
    let deleted_machines = {input: [], output: []}; 

    let old_outputs = old_list.output ?? {};
    let new_outputs = new_list.output ?? {};

    let old_inputs = old_list.input ?? {};
    let new_inputs = new_list.input ?? {};

    for(let slot of Object.entries(old_outputs)){
        for(let machine of slot){
            let machine_id = machine[0];
            let finder = new_outputs[slot[0]]?.find(element => element[0] == machine_id && element[1] == machine[1]);
            if(!finder) deleted_machines.output.push(finder);
        }
    }

    for(let slot of Object.entries(old_inputs)){
        for(let machine of slot){
            let machine_id = machine[0];
            let finder = new_inputs[slot[0]]?.find(element => element[0] == machine_id && element[1] == machine[1]);
            if(!finder) deleted_machines.input.push(finder);
        }
    }
    return deleted_machines;
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
