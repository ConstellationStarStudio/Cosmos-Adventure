import { system, ItemStack } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { output_fluid, load_to_canister, load_from_canister_instant } from "../../matter/fluids.js";
import { get_data } from "../Machine.js";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";

function make_smoke({ dimension, location }) {
    const { x, y, z } = location;
	const flame = (X, Y, Z) => { dimension.spawnParticle('minecraft:basic_flame_particle', { x: x + X, y: y + Y, z: z + Z }); };
	const smoke = (X, Y, Z) => { dimension.spawnParticle('minecraft:basic_smoke_particle', { x: x + X, y: y + Y, z: z + Z }); };
	flame(0.5, 0.95, 0.5); smoke(0.5, 0.9, 0.5);
	flame(0.6, 0.95, 0.4); smoke(0.7, 0.9, 0.3);
	flame(0.6, 0.95, 0.6); smoke(0.7, 0.9, 0.7);
	flame(0.4, 0.95, 0.4); smoke(0.3, 0.9, 0.3);
	flame(0.4, 0.95, 0.6); smoke(0.3, 0.9, 0.7);
	smoke(0.5, 1, 0.7); smoke(0.7, 1, 0.5);
	smoke(0.5, 1, 0.3); smoke(0.3, 1, 0.5);
}

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        
        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy ?? 0;
        this.oil = vars.oil ?? 0;
        this.fuel = vars.fuel ?? 0;
        
        this.lastUiUpdate = 0;
        this.lastSmokeTick = 0;
    }

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

		const data = get_data(this.entity);
        const container = this.entity.getComponent('minecraft:inventory').container;
		const dimension = this.entity.dimension;
		const active = this.entity.getDynamicProperty("active");

        let stateChanged = false;

		// 1. Charge the machine
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 1);
            // Energy loss
            if (Math.random() < 1/30) this.energy = Math.max(0, this.energy - 10);
        }

		// 2. Load oil from canister or bucket
		this.oil = load_from_canister_instant(this.oil, "oil", this.entity, 0).amount;

		// 3. Move fluids
		this.fuel = load_to_canister(this.fuel, "fuel", container, 2);
        for (let i = 0; i < dt; i++) {
		    this.fuel = output_fluid("fuel", this.entity, this.block, this.fuel);
        }

		// 4. Refine oil
		if (!active && this.oil > 0 && this.energy >= 120 && this.fuel < data.fuel.capacity) {
            // Processing 1 unit per 2 ticks -> 0.5 units per tick
            const processable = Math.min(this.oil, Math.floor(this.energy / 120), Math.floor(dt / 2) || (dt > 0 && Math.random() < 0.5 ? 1 : 0));
            if (processable > 0) {
                const space = data.fuel.capacity - this.fuel;
                const actual = Math.min(processable, space);
                if (actual > 0) {
                    this.oil -= actual;
                    this.fuel += actual;
                    this.energy -= actual * 120;
                    stateChanged = true;
                    
                    if (system.currentTick - this.lastSmokeTick > 20) {
                        make_smoke({ dimension, location: this.block.location });
                        this.lastSmokeTick = system.currentTick;
                    }
                }
            }
		}

		// 5. Status & UI
		const status =
		    this.energy === 0 ? "§4No Power" :
		    this.oil === 0 ? "§cNo Oil" :
		    this.energy < 120 ? "§6Not Enough Power" :
		    this.fuel === data.fuel.capacity ? "§cFull" :
		    active ? "§6Ready" :
		    "§2Refining";
		
        if (stateChanged || !container.getItem(3) || system.currentTick - this.lastUiUpdate > 20) {
		    save_dynamic_object(this.entity, { energy: Math.floor(this.energy), oil: Math.floor(this.oil), fuel: Math.floor(this.fuel) }, "machine_data");
		    container.add_ui_display(3, `Energy Storage\n§aEnergy: ${Math.floor(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.round((this.energy / data.energy.capacity) * 55));
		    container.add_ui_display(4, `Oil Storage\n§eOil: ${Math.floor(this.oil)} / ${data.oil.capacity} mB`, Math.ceil((Math.ceil(this.oil / 1000) / (data.oil.capacity / 1000)) * 38));
            container.add_ui_display(5, `Fuel Storage\n§eFuel: ${Math.floor(this.fuel)} / ${data.fuel.capacity} mB`, Math.ceil((Math.ceil(this.fuel / 1000) / (data.fuel.capacity / 1000)) * 38));
		    container.add_ui_display(6, `§rStatus:\n${status}`);
            this.lastUiUpdate = system.currentTick;
        }

        if (!container.getItem(7)) {
            this.entity.setDynamicProperty('active', !active);
            container.add_ui_button(7, !active ? 'Stop Refining' : 'Refine');
        }
	}
}