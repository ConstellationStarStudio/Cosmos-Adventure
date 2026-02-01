import { system, ItemStack } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_machine, charge_from_battery } from "../../matter/electricity"
import { get_data } from "../Machine";

export default class {
    constructor(entity, block) {
        this.entity = entity;
        this.block = block;
        
        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy || 0;
        this.water = vars.water || 0;
        this.o2 = vars.o2 || 0;
        this.h2 = vars.h2 || 0;
        
        this.lastUiUpdate = 0;
    }

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

        const data = get_data(this.entity);
        const container = this.entity.getComponent('minecraft:inventory').container;
        const active = this.entity.getDynamicProperty('active');

        let stateChanged = false;

        // 1. Energy management
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 1);
        }

        // 2. Water input
        this.water = insert_water(this.entity, this.water, data.water.capacity, 0);

        // 3. Electrolysis logic
        let status = '§6Idle';
        if (this.o2 >= data.o2.capacity && this.h2 >= data.h2.capacity) {
            status = '§cTanks Full';
        } else if (active && this.water > 0 && this.energy >= 375) {
            status = '§2Running';
            // processing function by delta time
            const processable = Math.min(this.water, Math.floor(this.energy / 375), dt);
            if (processable > 0) {
                const o2Space = data.o2.capacity - this.o2;
                const h2Space = data.h2.capacity - this.h2;
                const actual = Math.min(processable, Math.floor(o2Space / 2), Math.floor(h2Space / 4));
                
                if (actual > 0) {
                    this.water -= actual;
                    this.o2 += actual * 2;
                    this.h2 += actual * 4;
                    
                    const creative_battery = container.getItem(1)?.typeId === "cosmos:creative_battery";
                    if (!creative_battery) this.energy -= actual * 375;
                    stateChanged = true;
                }
            }
        }

        // 4. UI and Persistence
        if (stateChanged || !container.getItem(4) || system.currentTick - this.lastUiUpdate > 20) {
            save_dynamic_object(this.entity, { 
                energy: Math.floor(this.energy), 
                water: Math.floor(this.water), 
                o2: Math.floor(this.o2), 
                h2: Math.floor(this.h2) 
            }, "machine_data");

            container.add_ui_display(4, `Water Tank\n§e${Math.floor(this.water)} / ${data.water.capacity}`, Math.ceil((this.water / data.water.capacity) * 38));
            container.add_ui_display(5, `Gas Storage\n(Oxygen Gas)\n§e${Math.floor(this.o2)} / ${data.o2.capacity}`, Math.ceil((this.o2 / data.o2.capacity) * 38));
            container.add_ui_display(6, `Gas Storage\n(Hydrogen Gas)\n§e${Math.floor(this.h2)} / ${data.h2.capacity}`, Math.ceil((this.h2 / data.h2.capacity) * 38));
            container.add_ui_display(7, `Energy Storage\n§aEnergy: ${Math.floor(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.ceil((this.energy / data.energy.capacity) * 55));
            container.add_ui_display(8, `§rStatus:\n  ${this.energy < 375 ? '§cLow energy' : !this.water ? '§cNo Water!' : status}`);
            this.lastUiUpdate = system.currentTick;
        }

        if (!container.getItem(9)) {
            const newActive = active === undefined ? false : !active;
            this.entity.setDynamicProperty('active', newActive);
            container.add_ui_button(9, newActive === false ? "Process" : "Stop");
        }
    }
}

function insert_water(entity, water, capacity, slot) {
    const container = entity.getComponent('minecraft:inventory').container;
    const intake_slot = container.getItem(slot);
    if (intake_slot && intake_slot.typeId === "minecraft:water_bucket" && water + 1000 <= capacity) {
        container.setItem(slot, new ItemStack('bucket'));
        return water + 1000;
    } else return water;
}
