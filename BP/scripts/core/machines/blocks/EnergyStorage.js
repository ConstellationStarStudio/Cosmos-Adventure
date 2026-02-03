import { ItemStack } from "@minecraft/server";
import { charge_from_machine, charge_from_battery, charge_battery } from "../../matter/electricity.js";
import { get_data } from "../Machine.js";
import { compare_position, get_entity, load_dynamic_object, save_dynamic_object, compare_lists, location_of_side } from "../../../api/utils.js";

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;

        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy || 0;
        this.power = vars.power || 0;
        this.lastUiUpdate = 0;
    }

    /**
     * @param {number} dt 
     * @param {boolean} isViewed
     */
    tick(dt = 1, isViewed = false) {
        if (!this.entity.isValid) return;

		const store = this.entity;
		const container = this.entity.getComponent('minecraft:inventory').container;
		const store_data = get_data(store);

        // Process energy logic for elapsed ticks
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(store, this.block, this.energy);
            this.energy = charge_battery(store, this.energy, 0);
            this.energy = charge_from_battery(store, this.energy, 1);
        }
		
		this.power = Math.min(this.energy, store_data.energy.maxPower);

		// Store and display data
        if (isViewed || this.power > 0) {
		    save_dynamic_object(this.entity, { energy: Math.floor(this.energy), power: Math.floor(this.power) }, "machine_data");
        }
		
        // Update UI displays (always check for missing items, or if viewed )
        if (isViewed || !container.getItem(2) || should_update(this.lastUiUpdate, 20)) {
            container.add_ui_display(2, `§r ${Math.floor(this.energy)} gJ\nof ${store_data.energy.capacity} gJ`);
		    container.add_ui_display(3, '', Math.ceil((this.energy / store_data.energy.capacity) * 75 ));
            this.lastUiUpdate = system.currentTick;
        }
		
		// Visual block state update
		try { 
            if (this.block && this.block.isValid && this.block.typeId !== "minecraft:air") {
                const fill_level = Math.round((this.energy / store_data.energy.capacity) * 16);
                const perm = this.block.permutation;
                
                if (fill_level === 16) {
                    if (!perm.getState("cosmos:full")) {
                        this.block.setPermutation(perm.withState("cosmos:fill_level", 0).withState("cosmos:full", true));
                    }
                } else {
                    if (perm.getState("cosmos:fill_level") !== fill_level || perm.getState("cosmos:full")) {
                        this.block.setPermutation(perm.withState("cosmos:fill_level", fill_level).withState("cosmos:full", false));
                    }
                }
            }
        } catch (e) {}

        const energyChanged = Math.abs(this.energy - (vars.energy || 0)) > 0;
        return energyChanged || this.power > 0;
    }
}
function should_update(last, interval) { return (system.currentTick - last) >= interval; }
