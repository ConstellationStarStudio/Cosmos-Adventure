import { system, world, ItemStack } from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { output_fluid } from "../../matter/fluids";
import { update_tank, tanks } from "../../../api/player/oxygen";

export default function(entity, block) {
    const container = entity.getComponent('minecraft:inventory').container;
    const data = get_data(entity);
    let tank = container.getItem(1);
    const durability = tank?.getComponent("minecraft:durability");

    const variables = load_dynamic_object(entity, "machine_data");
    let energy = variables.energy || 0;
    let o2 = variables.o2 || 0;
    o2 = output_fluid({type: "o2", slot: "o2"}, entity, block, o2);
    // Energy management
    energy = charge_from_machine(entity, block, energy);
    energy = charge_from_battery(entity, energy, 0);
    
    if(!(system.currentTick % 20)){
        energy = Math.max(energy - 5, 0);
        if(energy >= 200 && tank && Object.keys(tanks).includes(tank.typeId) && durability.damage < durability.maxDurability){
            let saved_durability = durability ? durability.maxDurability - durability.damage:
            0;
            tank = update_tank(tank, Math.max(saved_durability - 40, 0));
            if(container.getItem(1)) container.setItem(1, tank);
            o2 = Math.min(data["o2"].capacity, o2 + 20)
            energy = Math.max(0, energy - 200);
        }
    }
    save_dynamic_object(entity, {energy, o2}, "machine_data");
    
    let status = (energy < 200)? "§4Not Enough Power":
    (!tank || !Object.keys(tanks).includes(tank.typeId))? "§4No Valid Oxygen Tank":
    (durability.damage == durability.maxDurability)? "§4Oxygen Tank Empty":
    "§2Active";
    
    const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data["energy"].capacity} gJ`;
    const oxygen_hover = `Oxygen Storage\n§aOxygen: ${o2}/${data["o2"].capacity}`; 

    container.add_ui_display(2, energy_hover, Math.round((energy / data["energy"].capacity) * 55))
    container.add_ui_display(3, oxygen_hover, Math.round((o2 / data["o2"].capacity) * 55))
    container.add_ui_display(4, '§rStatus: ' + status)
}