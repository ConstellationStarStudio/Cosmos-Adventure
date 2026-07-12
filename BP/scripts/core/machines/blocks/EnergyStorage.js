import { charge_from_machine, charge_from_battery, charge_battery } from "../../matter/electricity.js";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";

const data = {
	energy_storage_module: {
		onTick: onTick,
		energy: {
			input: "left",
			output: "right", 
			capacity: 500000,
			maxPower: 300,
			maxInput: 750
		},
	},
	energy_storage_cluster: {
		onTick: onTick,
		energy: {
			input: "left",
			output: "right", 
			capacity: 2500000,
			maxPower: 1800,
			maxInput: 4500
		},
	}
}

function onTick(entity, block) {
	// retrieve data
	const container = entity.getComponent('minecraft:inventory').container;
	const store_data = data[entity.typeId.replace('cosmos:', '')]
	const variables = load_dynamic_object(entity, "machine_data");
	let energy = variables.energy || 0;
	let power = variables.power || 0;

	energy = energy ? + energy : 0
	
	energy = charge_from_machine(entity, block, energy)
	
	energy = charge_battery(entity, energy, 0)
	
	energy = charge_from_battery(entity, energy, 1)
	
	power = Math.min(energy, store_data.energy.maxPower);
	// store and display data

	save_dynamic_object(entity, {energy, power}, "machine_data");
	container.add_ui_display(2, `§r ${energy} gJ\nof ${store_data.energy.capacity} gJ`)
	container.add_ui_display(3, '', Math.ceil((energy/ store_data.energy.capacity) * 75 ))
	
	// change the block look
	try { if (block?.typeId != "minecraft:air") {
		const fill_level = Math.round((energy/ store_data.energy.capacity) * 16 )
		if (fill_level == 16) block.setPermutation(block.permutation
			.withState("cosmos:fill_level", 0)
			.withState("cosmos:full", true)
		)
		else block.setPermutation(block.permutation
			.withState("cosmos:fill_level", fill_level)
			.withState("cosmos:full", false)
		)
	}} catch { null }
}; export default data