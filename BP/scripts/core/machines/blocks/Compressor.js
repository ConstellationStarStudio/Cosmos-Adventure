import { ItemStack } from "@minecraft/server";
import recipes from "../../../recipes/compressor"
import machines from "../AllMachineBlocks"
import { compare_lists, load_dynamic_object, save_dynamic_object} from "../../../api/utils";

const fuelTypes = new Set(["minecraft:coal", "minecraft:charcoal", "minecraft:coal_block"])

function get_ingredients(container) {
	const inputs = machines.compressor.items.top_input
	return inputs.map(i => container.getItem(i))
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

	compress() {
		const container = this.entity.getComponent('minecraft:inventory').container;
		const items = get_ingredients(container)
		const ingredients = [...items.map(i => i?.typeId)].filter(i => i).sort()
		const output = find_recipe(ingredients)
		const output_item = container.getItem(10)
		const has_space = !output_item || (output_item.typeId == output && output_item.amount < 64)
		const fuelItem = container.getItem(9);
		const isCoalBlock = fuelItem?.typeId === 'minecraft:coal_block'; 

		const variables = load_dynamic_object(this.entity);
		let burnTime = variables.burnTime || 0;
		let burnDuration = variables.burnDuration || 0;
		let progress = variables.progress || 0;

		let first_values = [burnTime, burnDuration, progress]

		if (burnTime == 0 && output && has_space && fuelTypes.has(fuelItem?.typeId) ) {
			container.setItem(9, fuelItem.decrementStack())
			burnTime = isCoalBlock ? 16010 : 1610
			burnDuration = isCoalBlock ? 16010 : 1610
		}
		if (burnTime > 0) burnTime--

		if (burnTime > 0 && progress < 200 && output && has_space) progress++

		if ((burnTime == 0 || !has_space) && progress > 0) progress--

		if (!output && progress > 0) progress = 0

		if ([120, 160, 200].includes(progress)) this.block.dimension.playSound("random.anvil_land", this.entity.location)

		if (progress == 200) {
			progress = 0
			for (let i = 0; i < 9; i++) {
				if (items[i]) container.setItem(i, items[i].decrementStack())
			}
			if (output_item?.typeId == output) {
				container.setItem(10, output_item.incrementStack())
			} else container.setItem(10, new ItemStack(output))
		}


		if(!compare_lists(first_values, [burnTime, burnDuration, progress]) || !container.getItem(11)){
			save_dynamic_object(this.entity, {progress, burnDuration, burnTime})
			container.add_ui_display(11, '', Math.round((burnTime / burnDuration) * 13))
			container.add_ui_display(12, '', Math.ceil((progress / 200) * 52))
			container.add_ui_display(13, `§r   Status:\n${!progress ? '    §6Idle' : '§2Compressing'}`)
		}

	}
}

