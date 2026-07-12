import { ItemStack } from "@minecraft/server";
import { charge_from_battery, charge_from_machine as charge_from_block } from "../../matter/electricity.js";
import recipes from "../../../recipes/circuit_fabricator.js"
import { compare_lists, load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";

const DiamondSlot = 0, Silicon1Slot = 1, Silicon2Slot = 2, RedstoneSlot = 3
const InputSlot = 4, BatterySlot = 5, OutputSlot = 6
const EnergyDisplay = 7, ProgressDisplay = 8, StatusDisplay = 9

const IngredientSlots = [DiamondSlot, Silicon1Slot, Silicon2Slot, RedstoneSlot]
const IngredientTypes = ["minecraft:diamond", "cosmos:raw_silicon", "cosmos:raw_silicon", "minecraft:redstone"]

const MaxProgress = 150

const data = {
	energy: {input: "right", capacity: 16000, maxInput: 45, rate: 20},
	items: {
		top_input: [InputSlot],
		side_input: IngredientSlots,
		output: [OutputSlot]
	},
	onTick(entity, block) {
		const container = entity.getComponent('minecraft:inventory').container
		const materials = IngredientSlots.map(i=> container.getItem(i))
		const [input_item, output_item] = [InputSlot, OutputSlot].map(i=> container.getItem(i))
		const recipe = recipes.get(input_item?.typeId)
		const has_space = !output_item || (recipe && output_item.typeId == recipe.item && recipe.amount + output_item.amount <= 64)
		const has_ingredients = compare_lists(materials.map(i=> i?.typeId), IngredientTypes)

		const variables = load_dynamic_object(entity, "machine_data")
		const tier = load_dynamic_object(entity, "machine_data", "energy_tier")?.level ?? 1;
		let energy = variables.energy || 0
		let progress = variables.progress || 0

		let first_values = [energy, progress]
		
		energy = charge_from_block(entity, block, energy)
		energy = charge_from_battery(entity, energy, BatterySlot)
		// increase the progress if has ingredients, the recipe matches, has space, and energy
		if (has_ingredients && recipe && has_space && energy > data.energy.rate && progress < MaxProgress) progress++, energy -= Math.min(energy, data.energy.rate)
		// regress the progress if no space or no energy
		if (progress && (!has_space || energy <= data.energy.rate)) progress--
		// reset the progress if no ingredients or the recipe changed
		if (progress && (!has_ingredients || !recipe)) progress = 0
		// craft the item if progress is full
		let time_required = MaxProgress / tier;
		if (progress >= time_required) {
			progress = 0
			// decrement the input item
			container.setItem(InputSlot, input_item.decrementStack())
			// decrement one of each ingredient
			for (const slot of IngredientSlots) container.setItem(slot, materials[slot].decrementStack())
			// put an item in the output slot
			if (output_item?.typeId != recipe.item) container.setItem(OutputSlot, new ItemStack(recipe.item, recipe.amount))
			// or increment the output item amount 
			else output_item.amount += recipe.amount, container.setItem(OutputSlot, output_item)
			// play sound effect
			block.dimension.playSound("random.anvil_land", entity.location)
		}

		save_dynamic_object(entity, {energy, progress}, "machine_data")
		if(!compare_lists(first_values, [energy, progress]) || !container.getItem(EnergyDisplay)){
			const energy_hover = `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`
			container.add_ui_display(EnergyDisplay, energy_hover, Math.round((energy / data.energy.capacity) * 55))
			container.add_ui_display(ProgressDisplay, `Progress: ${Math.round((progress / time_required) * 100)}%`, Math.round((progress / time_required) * 51))
			container.add_ui_display(StatusDisplay, `§r Status:\n${energy <= data.energy.rate ? '§4No Power' : progress ? '§2Running' : '   §6Idle'}`)
		}
	}
}; export default data

