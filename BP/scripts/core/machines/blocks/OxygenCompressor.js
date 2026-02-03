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

        // fluid input
        for (let i = 0; i < dt; i++) {
            this.o2 = input_fluid("o2", this.entity, this.block, this.o2);
            // Gradual load from canister 
            if (Math.random() < dt / 10) this.o2 = load_from_canister_gradual(this.o2, "o2", this.entity, 2);
        }

        // energy management
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 0);
        }

        // Compression Logic
        // Og if(!(system.currentTick % 20))
        const compressionTicks = Math.floor(dt / 20) || (dt > 0 && Math.random() < dt/20 ? 1 : 0);
        if (compressionTicks > 0) {
            this.energy = Math.max(this.energy - (5 * compressionTicks), 0);
            
            if (this.energy >= 300 && tank && Object.keys(tanks).includes(tank.typeId) && durability?.damage) {
                const spaceInTank = durability.damage;
                const canFill = Math.min(this.o2, 40 * compressionTicks, spaceInTank);
                
                if (canFill > 0) {
                    const saved_durability = durability.maxDurability - durability.damage;
                    tank = update_tank(tank, saved_durability + canFill);
                    container.setItem(1, tank);
                    
                    this.o2 = Math.max(0, this.o2 - canFill);
                    this.energy = Math.max(0, this.energy - (300 * compressionTicks));
                    stateChanged = true;
                }
            }
        }

        // Status & UI
        let status = (this.energy < 300)? "§4Not Enough Power":
            (!tank || !Object.keys(tanks).includes(tank.typeId))? "§4No Valid Oxygen Tank":
            (!durability?.damage)? "§4Oxygen Tank Full":
            (this.o2 === 0)? "§4Not Enough Oxygen":
            "§2Active";
        
        save_dynamic_object(this.entity, { energy: Math.floor(this.energy), o2: Math.floor(this.o2) }, "machine_data");
        
        if (!container.getItem(3) || system.currentTick - this.lastUiUpdate > 20) {
            const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
            const oxygen_hover = `Oxygen Storage\n§aOxygen: ${Math.floor(this.o2)}/${data["o2"].capacity}`;

            container.add_ui_display(3, energy_hover, Math.round((this.energy / data.energy.capacity) * 55));
            container.add_ui_display(4, oxygen_hover, Math.round((this.o2 / data["o2"].capacity) * 55));
            container.add_ui_display(5, '§rStatus: ' + status);
            this.lastUiUpdate = system.currentTick;
        }

        return this.energy > 0 || this.o2 > 0;
    }
}
