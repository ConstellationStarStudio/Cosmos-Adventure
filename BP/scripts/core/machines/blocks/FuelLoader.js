import { system, ItemStack } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { compare_lists, load_dynamic_object, location_of_side, save_dynamic_object } from "../../../api/utils.js";
import { get_data } from "../Machine.js";
import { input_fluid, load_from_canister_instant } from "../../matter/fluids.js";

function get_rockets(block) {
	if (!block.location) return [];
    let rockets = [];
    let pad_one_loc = location_of_side(block, "front");
    let pad_two_loc = location_of_side(block, "back");
    
    const getPadAt = (loc) => {
        if (!loc) return undefined;
        const padLoc = {
            x: block.location.x + ((loc.x - block.location.x) * 2),
            y: block.location.y,
            z: block.location.z + ((loc.z - block.location.z) * 2)
        };
        const b = block.dimension.getBlock(padLoc);
        if (b && !b.isAir && b.typeId === "cosmos:rocket_launch_pad" && b.permutation.getState("cosmos:center")) return b;
        return undefined;
    };

    const pad_one = getPadAt(pad_one_loc);
    const pad_two = getPadAt(pad_two_loc);

    if (pad_one) {
        const r = pad_one.dimension.getEntities({ families: ["rocket"], location: pad_one.center(), maxDistance: 1 });
        if (r.length > 0) rockets.push(r[0]);
    }
    if (pad_two) {
        const r = pad_two.dimension.getEntities({ families: ["rocket"], location: pad_two.center(), maxDistance: 1 });
        if (r.length > 0) rockets.push(r[0]);
    }
    return rockets;
}

export default class {
    constructor(entity, block) {
        this.entity = entity;
		this.block = block;
        
        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy ?? 0;
        this.fuel = vars.fuel ?? 0;
        
        this.lastUiUpdate = 0;
    }

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

        const stopped = this.entity.getDynamicProperty('stopped') ?? true;
        const container = this.entity.getComponent('minecraft:inventory').container;
		const data = get_data(this.entity);

        let stateChanged = false;

        // 1. Energy management
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 1);
        }

        // 2. Fluid input
        for (let i = 0; i < dt; i++) {
            this.fuel = input_fluid("fuel", this.entity, this.block, this.fuel);
        }
		this.fuel = load_from_canister_instant(this.fuel, "fuel", this.entity, 0).amount;

        // 3. Loading Logic
		if (!stopped && this.energy > 0 && this.fuel >= 2 && this.block && this.block.isValid) {
		    const rockets = get_rockets(this.block);
		    if (rockets.length > 0) {
		        rockets.forEach((rocket) => {
					const rocket_vars = load_dynamic_object(rocket, "vehicle_data") || {};
		            let fuel_level = rocket_vars.fuel ?? 0;
                    
		            if (fuel_level < 1000) {
                        const amountToLoad = Math.min(1000 - fuel_level, dt * 2, this.fuel);
                        const energyCost = (amountToLoad / 2) * 30;
                        
                        if (this.energy >= energyCost) {
                            rocket_vars.fuel = fuel_level + amountToLoad;
                            save_dynamic_object(rocket, rocket_vars, "vehicle_data");
                            
                            this.fuel = Math.max(0, this.fuel - amountToLoad);
                            this.energy = Math.max(0, this.energy - energyCost);
                            stateChanged = true;
                        }
		            }
		        });
		    }
		}

                // 4. UI and Persistence
                if (stateChanged || system.currentTick - this.lastUiUpdate > 20 || !container.getItem(2)) {
        		    save_dynamic_object(this.entity, { energy: Math.floor(this.energy), fuel: Math.floor(this.fuel) }, "machine_data");
        		
        		    const status =
        			    this.energy === 0 ? "§4No Power" : 
        			    this.fuel === 0 ? "§4No Fuel to Load" :
        			    stopped ? "§6Ready" :
        			    this.energy < 30 ? "§6Not Enough Power" :
        			    "§2Load Fuel";
                
        		    container.add_ui_display(2, `Energy Storage\n§aEnergy: ${Math.floor(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.round((this.energy / data.energy.capacity) * 55));
        		    container.add_ui_display(3, `Fuel Storage\n§eFuel: ${Math.floor(this.fuel)} / ${data.fuel.capacity} mB`, Math.ceil((Math.ceil(this.fuel / 1000) / (data.fuel.capacity / 1000)) * 38));
        		    container.add_ui_display(4, `§rStatus: ${status}`);
                    this.lastUiUpdate = system.currentTick;
                }
        if (!container.getItem(5)) {
            this.entity.setDynamicProperty('stopped', !stopped);
            container.add_ui_button(5, !stopped ? 'Stop Loading' : 'Loading');
        }
	}
}