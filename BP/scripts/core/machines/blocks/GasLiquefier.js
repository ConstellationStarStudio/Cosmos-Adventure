import { system } from "@minecraft/server";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { get_data } from "../Machine";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { fluid_names, load_from_canister } from "../../matter/fluids";

export default class {
	constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        
        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy || 0;
        this.input_tank = vars.input_tank ?? { amount: 0 };
        this.output_tank = vars.output_tank ?? { amount: 0 };
        
        this.lastUiUpdate = 0;
	}

    /**
     * @param {number} dt 
     */
	tick(dt = 1) {
        if (!this.entity.isValid) return;

        //loading data
		const data = get_data(this.entity);
		const container = this.entity.getComponent('minecraft:inventory').container;
        const active = this.entity.getDynamicProperty('active');

		// 1. Managing energy
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 1);
        }

		// 2. Manage fluids (loading from canisters)
		const input = container.getItem(0);
		if (input) {
            const types = {
                "cosmos:o2_canister": { type: "o2_gas", ratio: 2 },
                "cosmos:n2_canister": { type: "n2_gas", ratio: 2 },
                "cosmos:methane_canister": { type: "methane_gas", ratio: 1 }
            };
            
            const config = types[input.typeId];
            if (config && (this.input_tank.type === config.type || this.input_tank.type === undefined)) {
                this.input_tank.type = config.type;
                this.input_tank.amount = load_from_canister({
                    item: input, ratio: config.ratio,
                    amount: this.input_tank.amount,
                    capacity: data.gas.capacity,
                    container, slot: 0
                });
            }
		}

        // 3. Liquefaction Logic
        // [Add liquefaction logic here when defined]

        // 4. UI Display
        if (!container.getItem(3) || system.currentTick - this.lastUiUpdate > 20) {
            save_dynamic_object(this.entity, { energy: Math.floor(this.energy), input_tank: this.input_tank, output_tank: this.output_tank }, "machine_data");
		    container.add_ui_display(3, `Energy Storage\n§aEnergy: ${Math.floor(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.ceil((this.energy / data.energy.capacity) * 55));
		    container.add_ui_display(4, `Gas Storage\n(${fluid_names[this.input_tank.type]}\n§e${Math.floor(this.input_tank.amount)} / ${data.gas.capacity}`, Math.ceil((this.input_tank.amount / data.gas.capacity) * 38));
		    container.add_ui_display(5, `Liquid Tank\n(${fluid_names[this.output_tank.type]}\n§e${Math.floor(this.output_tank.amount)} / ${data.liquid.capacity}`, Math.ceil((this.output_tank.amount / data.liquid.capacity) * 38));
            this.lastUiUpdate = system.currentTick;
        }

        return this.energy > 0 && this.input_tank.amount > 0;
	}
}
