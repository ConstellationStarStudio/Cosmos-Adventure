import { ItemStack } from "@minecraft/server";
import recipes from "../../../recipes/compressor"
import machines from "../AllMachineBlocks"
import { compare_lists, load_dynamic_object, save_dynamic_object } from "../../../api/utils";

const fuelTypes = new Set(["minecraft:coal", "minecraft:charcoal", "minecraft:coal_block"]);

function get_ingredients(container) {
	const inputs = machines.compressor.items.top_input;
	return inputs.map(i => container.getItem(i));
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
        this.burnTime = vars.burnTime || 0;
        this.burnDuration = vars.burnDuration || 0;
        this.progress = vars.progress || 0;
        this.lastUiUpdate = 0;
	}

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

		const container = this.entity.getComponent('minecraft:inventory').container;
		const items = get_ingredients(container);
		const ingredientIds = [...items.map(i => i?.typeId)].filter(i => i).sort();
		const output = find_recipe(ingredientIds);
		const output_item = container.getItem(10);
		const has_space = !output_item || (output_item.typeId === output && output_item.amount < output_item.maxAmount);
		const fuelItem = container.getItem(9);
		const isCoalBlock = fuelItem?.typeId === 'minecraft:coal_block'; 

        let stateChanged = false;

        // 1. Fuel Start
		if (this.burnTime === 0 && output && has_space && fuelTypes.has(fuelItem?.typeId)) {
			container.setItem(9, fuelItem.decrementStack());
			this.burnTime = isCoalBlock ? 16010 : 1610;
			this.burnDuration = isCoalBlock ? 16010 : 1610;
            stateChanged = true;
		}

        // 2. Burn Logic
		if (this.burnTime > 0) {
            const consumption = Math.min(this.burnTime, dt);
            this.burnTime -= consumption;
            stateChanged = true;
        }

        // 3. Progress Logic
		if (this.burnTime > 0 && this.progress < 200 && output && has_space) {
            const gain = Math.min(200 - this.progress, dt);
            
            // Sound triggers
            const oldProgress = this.progress;
            this.progress += gain;
            
            [120, 160, 200].forEach(threshold => {
                if (oldProgress < threshold && this.progress >= threshold) {
                    this.block.dimension.playSound("random.anvil_land", this.entity.location);
                }
            });
            stateChanged = true;
        } else if ((this.burnTime === 0 || !has_space) && this.progress > 0) {
            this.progress = Math.max(0, this.progress - dt);
            stateChanged = true;
        }

		if (!output && this.progress > 0) {
            this.progress = 0;
            stateChanged = true;
        }

        // 4. Completion
		if (this.progress >= 200) {
			this.progress = 0;
			for (let i = 0; i < 9; i++) {
				if (items[i]) container.setItem(i, items[i].decrementStack());
			}
			if (output_item?.typeId === output) {
				container.setItem(10, output_item.incrementStack());
			} else container.setItem(10, new ItemStack(output));
            stateChanged = true;
		}

        // 5. UI and Persistence
		if (stateChanged || !container.getItem(11) || system.currentTick - this.lastUiUpdate > 20) {
			save_dynamic_object(this.entity, { progress: this.progress, burnDuration: this.burnDuration, burnTime: this.burnTime }, "machine_data");
			container.add_ui_display(11, '', Math.round((this.burnTime / this.burnDuration) * 13));
			container.add_ui_display(12, '', Math.ceil((this.progress / 200) * 52));
			container.add_ui_display(13, `§r   Status:\n${!this.progress ? '    §6Idle' : '§2Compressing'}`);
            this.lastUiUpdate = system.currentTick;
		}
	}
}