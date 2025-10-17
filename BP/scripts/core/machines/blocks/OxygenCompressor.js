import { system, world, ItemStack } from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { input_fluid, load_from_canister_gradual } from "../../matter/fluids";
import { update_tank, tanks } from "../../../api/player/oxygen";

export default class {
    constructor(entity, block) {
        this.entity = entity;
		this.block = block;
        if (entity.isValid) this.compress_oxygen()
    }

    onPlace(){}
    compress_oxygen() {
        const container = this.entity.getComponent('minecraft:inventory').container;
		const data = get_data(this.entity);
        let tank = container.getItem(1);
        const durability = tank?.getComponent("minecraft:durability");

        const variables = load_dynamic_object(this.entity);
        let energy = variables.energy || 0;
        let o2 = variables.o2 || 0;
        o2 = input_fluid("o2", this.entity, this.block, o2);
        if(!(system.currentTick % 10)) o2 = load_from_canister_gradual(o2, "o2", this.entity, 2);
        // Energy management
        energy = charge_from_machine(this.entity, this.block, energy);
        energy = charge_from_battery(this.entity, energy, 0);
        
        if(!(system.currentTick % 20)){
            energy = Math.max(energy - 5, 0);
            if(energy >= 300 && tank && Object.keys(tanks).includes(tank.typeId) && durability.damage){
                let saved_durability = durability ? durability.maxDurability - durability.damage:
                0;
                tank = update_tank(tank, Math.min(saved_durability + Math.min(o2, 40), durability.maxDurability));
                if(container.getItem(1)) container.setItem(1, tank);
                o2 = Math.max(0, o2 - 40)
                energy = Math.max(0, energy - 300);
            }
        }
        save_dynamic_object(this.entity, {energy, o2});
        
        let status = (energy < 300)? "§4Not Enough Power":
        (!tank || !Object.keys(tanks).includes(tank.typeId))? "§4No Valid Oxygen Tank":
        (!durability.damage)? "§4Oxygen Tank Full":
        (o2 == 0)? "§4Not Enough Oxygen":
        "§2Active";
        
        const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
        const oxygen_hover = `Oxygen Storage\n§aOxygen: ${o2}/${data["o2"].capacity}`; 

        container.add_ui_display(3, energy_hover, Math.round((energy / data.energy.capacity) * 55))
        container.add_ui_display(4, oxygen_hover, Math.round((o2 / data["o2"].capacity) * 55))
        container.add_ui_display(5, '§rStatus: ' + status)
    }
}