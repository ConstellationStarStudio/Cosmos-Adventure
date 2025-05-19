import { ItemStack } from "@minecraft/server";
import recipes from "../../../recipes/compressor"
import { compare_lists } from "../../../api/utils";

const fuelTypes = new Set(["minecraft:coal", "minecraft:charcoal", "minecraft:coal_block"])

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
        if (entity.isValid()) this.generateHeat()
	}
    onPlace(){
		const container = this.entity.getComponent('minecraft:inventory').container
		container.add_ui_display(11)
		container.add_ui_display(12)
		container.add_ui_display(13, `§r   Status:\n    §6Idle`)
	}
	generateHeat() {
		const container = this.entity.getComponent('minecraft:inventory').container;
		const items = get_ingredients(container)
		const ingredients = [...items.map(i => i?.typeId)].filter(i => i).sort()
		const output = find_recipe(ingredients)
		const output_item = container.getItem(10)
		const has_space = !output_item || (output_item.typeId == output && output_item.amount < 64)
		const fuelItem = container.getItem(9);
		const isCoalBlock = fuelItem?.typeId === 'minecraft:coal_block';
		let burnTime = this.entity.getDynamicProperty("cosmos_burnTime");
		burnTime = (!burnTime)? 0:
		burnTime;

		let burnDuration = this.entity.getDynamicProperty("cosmos_burnDuration");
		burnDuration = (!burnDuration)? 1:
		burnDuration;
		
		let progress = this.entity.getDynamicProperty("cosmos_progress");
		progress = (!progress)? 0:
		progress;

		let first_burnTime = burnTime;
		let first_burnDuration = burnDuration;
		let first_progress = progress;

		if (fuelTypes.has(fuelItem?.typeId) && burnTime == 0 && output && has_space) {
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

		if(burnTime !== first_burnTime || burnDuration !== first_burnDuration){
			container.add_ui_display(11, '', Math.round((burnTime / burnDuration) * 13))
		}

		if(burnTime !== first_burnTime) this.entity.setDynamicProperty("cosmos_burnTime", burnTime);
		if(burnDuration != first_burnDuration || progress !== first_progress){
			this.entity.setDynamicProperty("cosmos_progress", progress);
			this.entity.setDynamicProperty("cosmos_burnDuration", burnDuration);
			container.add_ui_display(12, '', Math.ceil((progress / 200) * 52))
			container.add_ui_display(13, `§r   Status:\n${!progress ? '    §6Idle' : '§2Compressing'}`)
		}

	}
}

