import { system, ItemStack } from "@minecraft/server";
import { compare_lists, load_dynamic_object, save_dynamic_object } from "../../../api/utils";
import recipes from "../../../recipes/compressor"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { get_data } from "../Machine.js";

function get_ingredients(container) {
	const ingredients = []
	for (let i = 0; i < 9; i++) {
		ingredients.push(container.getItem(i))
	} return ingredients
}

function find_recipe(ingredients) {
	for (let [result, recipe] of recipes) {
		if (ingredients.length !== recipe.length) continue;
		if (!compare_lists(recipe, ingredients)) continue;
		else return result;
	} return undefined;
}

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

        // Energy input
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 9);
            // Passive loss approx
            if (Math.random() < 1/80) this.energy = Math.max(0, this.energy - 1);
        }

		const items = get_ingredients(container);
		const ingredientIds = [...items.map(i => i?.typeId)].filter(i => i).sort();
		const output = find_recipe(ingredientIds);
		const output_items = [container.getItem(10), container.getItem(11)];
		
		const can_fit = (slot_idx, amount) => {
            const item = output_items[slot_idx];
            return !item || (item.typeId === output && item.amount + amount <= item.maxAmount);
        };

        // Progress logic
        if (this.energy > 0 && this.progress < 200 && output && (can_fit(0, 1) || can_fit(1, 1))) {
			const gain = Math.min(200 - this.progress, dt * 5);
			this.progress += gain;
			this.energy = Math.max(0, this.energy - (50 * (gain / 5)));
            stateChanged = true;
		} else if ((this.energy === 0 || (output === undefined || (!can_fit(0, 1) && !can_fit(1, 1)))) && this.progress > 0) {
            this.progress = Math.max(0, this.progress - (dt * 5));
            stateChanged = true;
        }

        // Completion
        if (this.progress >= 200) {
			this.block.dimension.playSound("random.anvil_land", this.entity.location);
			this.progress = 0;
			
            const itemsWithout = items.filter(i => i !== undefined);
            if (itemsWithout.length > 0) {
                let min = itemsWithout[0].amount;
                for (const item of itemsWithout) if (item.amount < min) min = item.amount;

                if (min < 2 && (can_fit(0, 1) || can_fit(1, 1))) {
                    for (let i = 0; i < 9; i++) if (items[i]) container.setItem(i, items[i].decrementStack(1));
                    if (can_fit(0, 1)) {
                        if (output_items[0]?.typeId === output) container.setItem(10, output_items[0].incrementStack());
                        else container.setItem(10, new ItemStack(output));
                    } else if (can_fit(1, 1)) {
                        if (output_items[1]?.typeId === output) container.setItem(11, output_items[1].incrementStack());
                        else container.setItem(11, new ItemStack(output));
                    }
                } else if (min >= 2 && (can_fit(0, 2) || can_fit(1, 2) || (can_fit(0, 1) && can_fit(1, 1)))) {
                    // Two items logic
                    for (let i = 0; i < 9; i++) if (items[i]) container.setItem(i, items[i].decrementStack(2));
                    
                    if (can_fit(0, 1) && can_fit(1, 1)) {
                        if (output_items[0]?.typeId === output) container.setItem(10, output_items[0].incrementStack());
                        else container.setItem(10, new ItemStack(output));
                        if (output_items[1]?.typeId === output) container.setItem(11, output_items[1].incrementStack());
                        else container.setItem(11, new ItemStack(output));
                    } else if (can_fit(0, 2)) {
                        if (output_items[0]?.typeId === output) container.setItem(10, output_items[0].incrementStack(64, 2));
                        else container.setItem(10, new ItemStack(output, 2));
                    } else if (can_fit(1, 2)) {
                        if (output_items[1]?.typeId === output) container.setItem(11, output_items[1].incrementStack(64, 2));
                        else container.setItem(11, new ItemStack(output, 2));
                    }
                }
            }
            stateChanged = true;
		}

        // UI and Persistence
		if (stateChanged || !container.getItem(12) || system.currentTick - this.lastUiUpdate > 20) {
			save_dynamic_object(this.entity, { progress: Math.floor(this.progress), energy: Math.floor(this.energy) }, "machine_data");
		    const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
		    container.add_ui_display(12, energy_hover, Math.round((this.energy / data.energy.capacity) * 55));
		    container.add_ui_display(13, '', Math.ceil((this.progress / 200) * 52));
		    container.add_ui_display(14, '§rStatus: ' + (!this.energy ? '§4No Power' : this.progress > 0 ? '§2Running' : '§6Idle'));
            this.lastUiUpdate = system.currentTick;
		}

        return this.progress > 0 || (this.energy > 0 && output !== undefined && (can_fit(0, 1) || can_fit(1, 1)));
	}
}
