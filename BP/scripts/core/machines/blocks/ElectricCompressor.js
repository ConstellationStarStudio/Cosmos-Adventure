import { system, ItemStack } from "@minecraft/server";
import { compare_lists, load_dynamic_object, save_dynamic_object} from "../../../api/utils";
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
		if (ingredients.length != recipe.length) continue
		if (!compare_lists(recipe, ingredients)) {
			continue
		} else return result
	} return undefined
}
export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        if (entity.isValid) this.compress()
    }

    compress(){
		const container = this.entity.getComponent('minecraft:inventory').container;
		const data = get_data(this.entity);
		const variables = load_dynamic_object(this.entity, "machine_data");
		let energy = variables.energy || 0;
		let progress = variables.progress || 0;
		let first_values = [energy, progress]

		energy = charge_from_machine(this.entity, this.block, energy)
		energy = charge_from_battery(this.entity, energy, 9);
        if(!(system.currentTick % 80)) energy -= Math.min(1, energy)
		const items = get_ingredients(container)
		const ingredients = [...items.map(i => i?.typeId)].filter(i => i).sort()
		const output = find_recipe(ingredients)
		const output_items = [container.getItem(10), container.getItem(11)];
		const one_has_space = (oneItemMax) => (!output_items[0] || (output_items[0].typeId == output && ((oneItemMax === 64)? output_items[0].amount < oneItemMax: output_items[0].amount <= oneItemMax)))
		const two_has_space = (twoItemMax) => (!output_items[1] || (output_items[1].typeId == output && ((twoItemMax === 64)? output_items[1].amount < twoItemMax: output_items[1].amount <= twoItemMax)))
        if (energy > 0 && progress < 200 && output && (one_has_space(64) || two_has_space(64))) {
			progress = progress + 5;
			energy -= Math.min(50, energy);
		}

		if ((energy == 0 || (output === undefined || (!one_has_space(64) && !two_has_space(64)))) && progress > 0) progress = progress - 5
        if (progress == 200) {
			this.block.dimension.playSound("random.anvil_land", this.entity.location)
			progress = 0
			let itemsWithout = items.filter((itemWithout) => itemWithout != undefined)
			let min = itemsWithout[0].amount;
			for (const item of itemsWithout) {
				if(item.amount < min){
					min = item.amount;
				}
			}
			if((min < 2) && (one_has_space(64) || two_has_space(64))){
			for (let i = 0; i < 9; i++){
				if (items[i]) container.setItem(i, items[i].decrementStack(1))
			}
		    if(one_has_space(64)){
				if(output_items[0]?.typeId == output) {
					container.setItem(10, output_items[0].incrementStack())
				} else container.setItem(10, new ItemStack(output))
			}
			else if(two_has_space(64) && !one_has_space(64)){
				if(output_items[1]?.typeId == output) {
					container.setItem(11, output_items[1].incrementStack())
				} else container.setItem(11, new ItemStack(output))
			}
			}
			else if((min >= 2) && (one_has_space(63) || two_has_space(63))){
				for (let i = 0; i < 9; i++){
					if (items[i]) container.setItem(i, items[i].decrementStack(2))
				}
				if(one_has_space(63) && two_has_space(63)){
					if(output_items[0]?.typeId == output) {
						container.setItem(10, output_items[0].incrementStack())
					} else container.setItem(10, new ItemStack(output))
					if(output_items[1]?.typeId == output) {
						container.setItem(11, output_items[1].incrementStack())
					} else container.setItem(11, new ItemStack(output))
				}
				else if(one_has_space(63) && !two_has_space(63)){
					if(output_items[0]?.typeId == output) {
						container.setItem(10, output_items[0].incrementStack(63, 2))
					} else container.setItem(10, new ItemStack(output, 2))
				}
				else if(!one_has_space(63) && two_has_space(63)){
					if(output_items[1]?.typeId == output) {
						container.setItem(11, output_items[1].incrementStack(63, 2))
					} else container.setItem(11, new ItemStack(output, 2))
				}
			}
		}
		if(!compare_lists(first_values, [energy, progress]) || !container.getItem(12)){
			save_dynamic_object(this.entity, {progress, energy}, "machine_data")
			
		    const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`
		    container.add_ui_display(12, energy_hover, Math.round((energy / data.energy.capacity) * 55))
		    container.add_ui_display(13, '', Math.ceil((progress / 200) * 52))
		    container.add_ui_display(14, '§rStatus: ' + (!energy ? '§4No Power' : progress ? '§2Running' : '§6Idle'))
		}
    }
}