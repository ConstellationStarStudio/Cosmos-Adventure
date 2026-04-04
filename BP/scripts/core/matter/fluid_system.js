import { world } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object} from "../../api/utils"

export function get_fluid_amount(machine, fluid_type){
    let fluid_storage = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');
    if(fluid_storage) {
        let machine_entity = (machine.id == fluid_storage)? machine: world.getEntity(fluid_storage);
        return fluid_amount(machine_entity, fluid_type) ?? 0;
    }

    let machines = JSON.parse(machine.getDynamicProperty("fluid_system") ?? {});
    if(!machines.output || !machines.output[fluid_type]) return;
    for(let machine of machines.output[fluid_type]){
        let machine_entity = world.getEntity(machine[0]); 
        let amount = fluid_amount(machine_entity, fluid_type);
        if(amount !== undefined){
            save_dynamic_object(machine, machine_entity.id, 'machine_data', 'fluid_storage_entity');
            return amount;
        }
    }
}
function fluid_amount(machine, fluid_type){
    const amount = load_dynamic_object(machine, 'machine_data', 'fluid_storage_amount') 
    return amount ? amount[fluid_type]: undefined;
}

export function save_fluid_amount(machine, fluid_type, amount){
    let fluid_storage = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');

    if(fluid_storage){
        let machine_entity = (machine.id == fluid_storage)? machine: world.getEntity(fluid_storage);
        let fluid = load_dynamic_object(machine_entity, 'machine_data', 'fluid_storage_amount');
        if(fluid && fluid[fluid_type] !== undefined){
            fluid[fluid_type] += amount;
            save_dynamic_object(machine_entity, fluid, 'machine_data', 'fluid_storage_amount');
        }
    }

    let machines = JSON.parse(machine.getDynamicProperty("fluid_system") ?? {});
    if(!machines.output || !machines.output[fluid_type]) return;
    for(let machine of machines.output[fluid_type]){
        let machine_entity = world.getEntity(machine[0]); 
        let amount = fluid_amount(machine_entity, fluid_type);
        if(amount !== undefined){
            save_dynamic_object(machine, machine_entity.id, 'machine_data', 'fluid_storage_entity');
            return amount;
        }
    }
}