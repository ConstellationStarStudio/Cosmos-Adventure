import { ItemStack } from "@minecraft/server";
import recipes from "../../../recipes/compressor"
import { compare_lists, load_dynamic_object, save_dynamic_object} from "../../../api/utils";

const fuelTypes = new Set(["minecraft:coal", "minecraft:charcoal", "minecraft:coal_block"])

const InputSlots = Array.from(Array(9).keys()) // 0 to 8
const FuelSlot = 9, OutputSlot = 10
const BurnDisplay = 11, ProgressDisplay = 12, StatusDisplay = 13

const MaxProgress = 200

export function find_recipe(ingredients) {
	for (let [result, recipe] of recipes) {
		if (ingredients.length != recipe.length) continue
		if (compare_lists(recipe, ingredients)) return result
	}
}

const data = {
	items: {
		top_input: InputSlots,
		side_input: [FuelSlot],
		output: [OutputSlot]
	},
	onTick(entity, block) {
		const container = entity.getComponent('minecraft:inventory').container;
		const items = InputSlots.map(slot => container.getItem(slot))
		const ingredients = items.map(item => item?.typeId).filter(i => i).sort()
		const recipe = find_recipe(ingredients)
		const output_item = container.getItem(OutputSlot)
		const has_space = !output_item || (output_item.typeId == recipe && output_item.amount < 64)
		const fuelItem = container.getItem(FuelSlot);
		const isCoalBlock = fuelItem?.typeId === 'minecraft:coal_block'; 

		const variables = load_dynamic_object(entity, "machine_data");
		let burnTime = variables.burnTime || 0;
		let burnDuration = variables.burnDuration || 0;
		let progress = variables.progress || 0;

		let first_values = [burnTime, burnDuration, progress]

		if (!burnTime && recipe && has_space && fuelTypes.has(fuelItem?.typeId) ) {
			container.setItem(FuelSlot, fuelItem.decrementStack())
			burnTime = burnDuration = isCoalBlock ? 16010 : 1610
		}
		if (burnTime) burnTime--

		if (burnTime && progress < MaxProgress && recipe && has_space) progress++

		if ((!burnTime || !has_space) && progress > 0) progress--

		if (!recipe && progress > 0) progress = 0

		if ([0.6 * MaxProgress, 0.8 * MaxProgress, MaxProgress].includes(progress)) block.dimension.playSound("random.anvil_land", entity.location)

		if (progress == MaxProgress) {
			progress = 0
			for (let i = 0; i < 9; i++) {
				if (items[i]) container.setItem(i, items[i].decrementStack())
			}
			if (output_item?.typeId == recipe) container.setItem(OutputSlot, output_item.incrementStack())
			else container.setItem(OutputSlot, new ItemStack(recipe))
		}

		save_dynamic_object(entity, {progress, burnDuration, burnTime}, "machine_data")
		if((entity.active_ui && !compare_lists(first_values, [burnTime, burnDuration, progress])) || !container.getItem(BurnDisplay)){
			container.add_ui_display(BurnDisplay, '', Math.round((burnTime / burnDuration) * 13))
			container.add_ui_display(ProgressDisplay, '', Math.ceil((progress / MaxProgress) * 52))
			container.add_ui_display(StatusDisplay, `§r   Status:\n${progress ? '§2Compressing' : '    §6Idle' }`)
		}
	}
}; export default data