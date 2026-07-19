import { system } from "@minecraft/server";
import { compare_lists, load_dynamic_object, save_dynamic_object } from "../../../api/utils";

const fuelTypes = new Set(["minecraft:coal", "minecraft:charcoal", "minecraft:coal_block"]);

const FuelSlot = 0, StatusDisplay = 1

const data = {
	energy: {output: "right", maxPower: 120},
	items: {
		top_input: [0],
		side_input: [0],
	},
	onTick(entity, block) {
		const container = entity.getComponent('minecraft:inventory').container
		const fuel = container.getItem(FuelSlot)

		const variables = load_dynamic_object(entity, "machine_data")
		let burnTime = variables.burnTime || 0
		let heat = variables.heat || 0
		let power = variables.power || 0

		let first_values = [burnTime, heat, power]

		if (burnTime === 0 && fuelTypes.has(fuel?.typeId)) {
			container.setItem(0, fuel.decrementStack())
			burnTime = fuel?.typeId === 'minecraft:coal_block' ? 3200 : 320
		}
		if (burnTime > 0) burnTime--

		// Adjust heat and power based on burnTime.
		if (burnTime > 0 && heat < 100) heat++
		if (burnTime === 0 && heat > 0 && power === 0) heat--
		if (burnTime > 0 && heat === 100 && burnTime % 3 === 0 && power < 120) power++
		if (burnTime === 0 && system.currentTick % 3 === 0 && power > 0) power--

		// Save and Update UI 
		if ((entity.active_ui && !compare_lists(first_values, [burnTime, heat, power])) || !container.getItem(StatusDisplay)) {
			save_dynamic_object(entity, { burnTime, heat, power }, "machine_data")
			const display_text = `§r${power == 0 ? 'Not Generating' : '   Generating'}\n${power == 0 ? ` Hull Heat: ${heat}%%` : `     §r${power} gJ/t`}`
			container.add_ui_display(StatusDisplay, display_text)
		}
	}
}; export default data