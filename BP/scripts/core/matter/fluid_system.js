import { world, system} from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils"
import { get_data } from "../machines/Machine";
import { side_blocks } from "../blocks/fluid_pipe";

export function get_fluid_amount(machine, fluid_data, fluid){
    let fluid_storage = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');
    const data = get_data(machine);
    const fluid_type = fluid_data.type;
    const slot = fluid_data.slot;
    const space = data[slot].capacity - fluid; 

    if(fluid_storage && fluid_storage[fluid_type]) {
        let machine_entity = (machine.id == fluid_storage[fluid_type])? machine: world.getEntity(fluid_storage[fluid_type]);

        let pipe_fluid = fluid_amount(machine_entity);
        let pipe_fluid_amount = pipe_fluid ? pipe_fluid[fluid_type]: 0;
        if(pipe_fluid_amount == 0) return fluid;

        pipe_fluid[fluid_type] -= Math.min(100, pipe_fluid_amount, space);

        save_dynamic_object(machine_entity, pipe_fluid, 'machine_data', 'fluid_storage_amount');
        return fluid + Math.min(pipe_fluid_amount, space, 100);
    }

    let machines = JSON.parse(machine.getDynamicProperty("fluid_system") ?? '{}');
    if(!machines.input || !machines.input[fluid_type]) return fluid;
    
    if(fluid_storage == undefined) fluid_storage = {};

    for(let storage of machines.input[slot]){
        let machine_entity = world.getEntity(storage[0]); 
        let amount = fluid_amount(machine_entity);
        if(amount && amount[fluid_type]){
            fluid_storage[fluid_type] = machine_entity.id;
            save_dynamic_object(machine, fluid_storage, 'machine_data', 'fluid_storage_entity');
            fluid += Math.min(amount[fluid_type], space, 100);
            amount[fluid_type] -= Math.min(100, amount[fluid_type], space);

            save_dynamic_object(machine_entity, amount, 'machine_data', 'fluid_storage_amount');
            return fluid;
        }
    }
    return fluid;
}
function fluid_amount(machine){
    const amount = load_dynamic_object(machine, 'machine_data', 'fluid_storage_amount') 
    return amount;
}

export function save_fluid_amount(machine, fluid_data, pipe, amount){
    let fluid_storage = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');
    if(fluid_storage && fluid_storage["unknown"]) return amount;
    const fluid_type = fluid_data.type;
    const slot = fluid_data.slot;

    if(fluid_storage && fluid_storage[fluid_type]){
        let machine_entity = (machine.id == fluid_storage[fluid_type])? machine: world.getEntity(fluid_storage[fluid_type]);
        let fluid = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        if(fluid && fluid[fluid_type] !== undefined){
            fluid[fluid_type] += amount;
            save_dynamic_object(machine_entity, fluid, 'machine_data', 'fluid_storage_amount');
            
            if(machine.id == fluid_storage[fluid_type]){
                let state = pipe.permutation.getState("cosmos:fluid");
                if(fluid[fluid_type] > 0 && state != fluid_type) system.runJob(update_fluid(pipe, fluid_type));
                else if(fluid[fluid_type] === 0 && state != "empty") system.runJob(update_fluid(pipe, "empty"));
            }
            return 0;
        }else if(fluid && Object.keys(fluid).length > 0){
            return amount;
        }
    }

    if(fluid_storage == undefined) fluid_storage = {};

    let machines = JSON.parse(machine.getDynamicProperty("fluid_system") ?? '{}');
    if(machines.output){
        for(let output of machines.output[slot]){
            let machine_entity = world.getEntity(output[0]); 
            let fluid = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
            if(fluid && fluid[fluid_type] !== undefined){
                fluid[fluid_type] += amount;
                fluid_storage[fluid_type] = machine_entity.id;
                save_dynamic_object(machine, fluid_storage, 'machine_data', 'fluid_storage_entity');
                save_dynamic_object(machine_entity, fluid, 'machine_data', 'fluid_storage_amount');
                return 0;
            }else if(fluid && Object.keys(fluid).length > 0){
                fluid_storage["unknown"] = machine_entity.id;
                save_dynamic_object(machine, fluid_storage, 'machine_data', 'fluid_storage_entity');
                return amount;
            }
        }
    }
    fluid_storage[fluid_type] = machine.id;
    let fluid = {}
    fluid[fluid_type] = amount;

    save_dynamic_object(machine, fluid_storage, 'machine_data', 'fluid_storage_entity');
    save_dynamic_object(machine, fluid, 'machine_data', 'fluid_storage_amount');

    return 0;
}

export function delete_storage(storage, old_list, new_list){
        let fluid = load_dynamic_object(storage, 'machine_data', 'fluid_storage_amount');
		//let old_machines_list = JSON.parse(machine.getDynamicProperty("fluid_system") ?? '{}');
        if(!fluid || Object.keys(fluid) === 0) return;
        if(JSON.stringify(old_list) == JSON.stringify(new_list)) return;

		if(new_list.output && old_list.output){
            for(let fluid_type in fluid){
                for(let slot of [...old_list.output[fluid_type], ...old_list.input[fluid_type]]){
                    let machine_entity = world.getEntity(slot[0]);
                    let fluid_entity = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_entity');
                    fluid_entity.delete(fluid_type);
                    save_dynamic_object(machine_entity, fluid_entity, 'machine_data', 'fluid_storage_entity');
                }
            }
	    }
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
function* update_fluid(pipe, fluid){
    let updated_pipes = [];
    let pipes_to_update = [];

    pipes_to_update = get_sides(pipe, updated_pipes);
    pipe.setPermutation(pipe.permutation.withState("cosmos:fluid", fluid))
    for(let i = 0; i < pipes_to_update.length; i++){
        let block = pipes_to_update[i];
        updated_pipes.push(JSON.stringify({x: block.x, y: block.y, z: block.z}));
        let new_pipe = pipe.dimension.getBlock(block);
        if(new_pipe && !new_pipe.isAir && new_pipe.typeId == "cosmos:fluid_pipe"){
            pipes_to_update = [...pipes_to_update, ...get_sides(new_pipe, updated_pipes)]
            new_pipe.setPermutation(new_pipe.permutation.withState("cosmos:fluid", fluid));
            yield;
        }
    }

}