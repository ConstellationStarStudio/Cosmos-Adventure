import { world } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils"
import { get_data } from "../machines/Machine";

export function get_fluid_amount(machine, fluid_type, fluid){
    let fluid_storage = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');
    const data = get_data(machine);
    const space = data[fluid_type].capacity - fluid; 

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

    for(let storage of machines.input[fluid_type]){
        let machine_entity = world.getEntity(storage[0]); 
        let amount = fluid_amount(machine_entity);
        if(amount && amount[fluid_type]){
            fluid_storage[fluid_type] = machine_entity.id;
            save_dynamic_object(machine, fluid_storage, 'machine_data', 'fluid_storage_entity');

            amount[fluid_type] -= Math.min(100, amount[fluid_type], space);

            save_dynamic_object(machine_entity, amount, 'machine_data', 'fluid_storage_amount');

            return fluid + Math.min(amount[fluid_type], space, 100);
        }
    }
    return fluid;
}
function fluid_amount(machine){
    const amount = load_dynamic_object(machine, 'machine_data', 'fluid_storage_amount') 
    return amount;
}

export function save_fluid_amount(machine, fluid_type, amount){
    let fluid_storage = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');

    if(fluid_storage && fluid_storage[fluid_type]){
        let machine_entity = (machine.id == fluid_storage[fluid_type])? machine: world.getEntity(fluid_storage[fluid_type]);
        let fluid = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        if(fluid && fluid[fluid_type] !== undefined){
            fluid[fluid_type] += amount;
            save_dynamic_object(machine_entity, fluid, 'machine_data', 'fluid_storage_amount');
            return 0;
        }else if(fluid && Object.entries(fluid).length > 0){
            return amount;
        }
    }

    if(fluid_storage == undefined) fluid_storage = {};

    let machines = JSON.parse(machine.getDynamicProperty("fluid_system") ?? '{}');

    if(machines.output){
        for(let machine of machines.output[fluid_type]){
            let machine_entity = world.getEntity(machine[0]); 
            let fluid = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');

            if(fluid && fluid[fluid_type]){
                fluid[fluid_type] += amount;
                fluid_storage[fluid_type] = machine_entity.id;

                save_dynamic_object(machine, fluid_storage, 'machine_data', 'fluid_storage_entity');
                save_dynamic_object(machine_entity, fluid, 'machine_data', 'fluid_storage_amount');
                return 0;
            }else if(fluid && Object.entries(fluid).length > 0){
                fluid_storage[fluid_type] = machine_entity.id;
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