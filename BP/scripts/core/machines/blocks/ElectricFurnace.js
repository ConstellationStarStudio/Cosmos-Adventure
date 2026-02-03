import { system, ItemStack } from "@minecraft/server";
import { compare_lists, load_dynamic_object, save_dynamic_object } from "../../../api/utils";
import recipes from "../../../recipes/electric_furnace"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { get_data } from "../Machine.js";

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        
        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy || 0;
        this.progress = vars.progress || 0;
        
        this.lastUiUpdate = 0;
    }

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

		const container = this.entity.getComponent('minecraft:inventory').container;
		const data = get_data(this.entity);

        let stateChanged = false;

        // 1. Energy input
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 1);
            // Passive loss
            if (Math.random() < 1/80) this.energy = Math.max(0, this.energy - 1);
        }

        // 2. Smelting Logic
		if (this.energy >= 45) {
			let input = container.getItem(0);
			let output = container.getItem(2);
			const outputId = recipes[input?.typeId];
            const has_space = !output || (output.typeId === outputId && output.amount < output.maxAmount);

			if (input && outputId && has_space) {
				if (this.progress < 200) {
                    const gain = Math.min(200 - this.progress, dt);
					this.progress += gain;
					this.energy = Math.max(0, this.energy - (45 * gain));
                    stateChanged = true;
				}
                
                if (this.progress >= 200) {
					this.progress = 0;
					output = (output)? output.incrementStack(): new ItemStack(outputId);
					container.setItem(0, input.decrementStack());
					container.setItem(2, output);
                    stateChanged = true;
				}
			} else {
				this.progress = Math.max(this.progress - dt, 0);
                stateChanged = true;
			}
		} else {
			this.progress = Math.max(this.progress - dt, 0);
            stateChanged = true;
		}

        // 3. UI and Persistence
		if (stateChanged || !container.getItem(3) || system.currentTick - this.lastUiUpdate > 20) {
			save_dynamic_object(this.entity, { energy: Math.floor(this.energy), progress: Math.floor(this.progress) }, "machine_data");
			const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
			container.add_ui_display(3, energy_hover, Math.round((this.energy / data.energy.capacity) * 55));
			container.add_ui_display(4, '', Math.ceil((this.progress / 200) * 24));
			container.add_ui_display(5, '§rStatus: ' + (!this.energy ? '\n§4No Power' : this.progress > 0 ? '\n§2Running' : '\n§6Idle'));
            this.lastUiUpdate = system.currentTick;
		}

        return this.progress > 0 || (this.energy >= 45 && input && recipes[input.typeId]);
    }
}