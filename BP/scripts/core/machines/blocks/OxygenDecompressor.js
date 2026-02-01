import { system, world, ItemStack } from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { output_fluid } from "../../matter/fluids";
import { update_tank, tanks } from "../../../api/player/oxygen";

export default class {
    constructor(entity, block) {
        this.entity = entity;
		this.block = block;
        
        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy || 0;
        this.o2 = vars.o2 || 0;
        
        this.lastUiUpdate = 0;
    }

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

        const container = this.entity.getComponent('minecraft:inventory').container;
		const data = get_data(this.entity);
        let tank = container.getItem(1);
        const durability = tank?.getComponent("minecraft:durability");

        let stateChanged = false;

        // Fluid output
        for (let i = 0; i < dt; i++) {
            this.o2 = output_fluid("o2", this.entity, this.block, this.o2);
        }

        // Energy management
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 0);
        }

        // Decompression Logic
        const decompressionTicks = Math.floor(dt / 20) || (dt > 0 && Math.random() < dt/20 ? 1 : 0);
        if (compressionTicks > 0) {
            this.energy = Math.max(this.energy - (5 * decompressionTicks), 0);
            
            if (this.energy >= 200 && tank && Object.keys(tanks).includes(tank.typeId) && durability?.damage < durability?.maxDurability) {
                const saved_durability = durability.maxDurability - durability.damage;
                const canDraw = Math.min(saved_durability, 40 * decompressionTicks);
                
                if (canDraw > 0) {
                    tank = update_tank(tank, Math.max(saved_durability - canDraw, 0));
                    container.setItem(1, tank);
                    
                    this.o2 = Math.min(data["o2"].capacity, this.o2 + (canDraw / 2)); // Original 40 tank -> 20 o2
                    this.energy = Math.max(0, this.energy - (200 * compressionTicks));
                    stateChanged = true;
                }
            }
        }

        // Status and UI
        let status = (this.energy < 200)? "§4Not Enough Power":
            (!tank || !Object.keys(tanks).includes(tank.typeId))? "§4No Valid Oxygen Tank":
            (durability?.damage === durability?.maxDurability)? "§4Oxygen Tank Empty":
            "§2Active";
        
        save_dynamic_object(this.entity, { energy: Math.floor(this.energy), o2: Math.floor(this.o2) }, "machine_data");
        
        if (!container.getItem(2) || system.currentTick - this.lastUiUpdate > 20) {
            const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(this.energy)} gJ\n§cMax Energy: ${data["energy"].capacity} gJ`;
            const oxygen_hover = `Oxygen Storage\n§aOxygen: ${Math.floor(this.o2)}/${data["o2"].capacity}`;

            container.add_ui_display(2, energy_hover, Math.round((this.energy / data["energy"].capacity) * 55));
            container.add_ui_display(3, oxygen_hover, Math.round((this.o2 / data["o2"].capacity) * 55));
            container.add_ui_display(4, '§rStatus: ' + status);
            this.lastUiUpdate = system.currentTick;
        }
    }
}
