import { world } from "@minecraft/server";
import { compare_position, get_entity, load_dynamic_object, location_of_side } from "../../api/utils";
import { get_data } from "../machines/Machine";

export class MachinesInNetwork {
	constructor(machine) {
		this.machine = machine;
	}
	getInputMachines() {
		const inputs = this.machine.getDynamicProperty("input_connected_machines")
		if (inputs) return JSON.parse(inputs)
	}
	getOutputMachines() {
		const outputs = this.machine.getDynamicProperty("output_connected_machines")
		if (outputs) return JSON.parse(outputs)
	}
}

export function charge_from_machine(entity, block, energy) {
	const data = get_data(entity)
	let connectedMachines = new MachinesInNetwork(entity).getInputMachines();
	if (connectedMachines && connectedMachines.length > 0 && energy < data.energy.capacity) {
		for (let input_entity_id of connectedMachines) {
			if (world.getEntity(input_entity_id[0]) && input_entity_id[0] != entity.id && input_entity_id[1] == "output") {
				let input_entity = world.getEntity(input_entity_id[0])
				let power = input_entity.getDynamicProperty("cosmos_power") ?? load_dynamic_object(input_entity, 'machine_data').power ?? 0
				let inputs = connectedMachines.filter((input) =>
					input[1] == "input"
				)
				power = (inputs.length > 0) ? Math.floor(power / (inputs.length + 1)) : power;
				const space = data.energy.capacity - energy
				if (power > 0) {
					energy += Math.min(data.energy.maxInput, power, space)
				}
			}
		}
	} else {
		const input_location = location_of_side(block, data.energy.input)
		const input_entity = get_entity(entity.dimension, input_location, "has_power_output")
		if (input_entity && energy < data.energy.capacity) {
			const input_block = entity.dimension.getBlock(input_location)
			const input_data = get_data(input_entity)
			const power = input_entity.getDynamicProperty("cosmos_power") ?? load_dynamic_object(input_entity, 'machine_data').power ?? 0
			const space = data.energy.capacity - energy
			const io = location_of_side(input_block, input_data.energy.output)
			if (compare_position(entity.location, io) && power > 0) {
				energy += Math.min(data.energy.maxInput, power, space)
			}
		}
	} return energy
}

export function charge_from_battery(entity, energy, slot) {
	const data = get_data(entity)
	const container = entity.getComponent('minecraft:inventory').container
	const battery = container.getItem(slot);
	if (battery && energy < data.energy.capacity){
		let durability = battery.getComponent('minecraft:durability');

		let battery_capacity = (durability)? durability.maxDurability - durability.damage: 0;
		if (battery_capacity > 0 && battery.typeId == "cosmos:battery") {
			let charge = battery_capacity;
			const space = data.energy.capacity - energy;
			energy += Math.min(data.energy.maxInput, 200, charge, space)
			charge -= Math.min(data.energy.maxInput, 200, charge, space)
			container.setItem(slot, update_battery(battery, charge))
		}
		else if (battery.typeId == "cosmos:atomic_battery") {
			const space = data.energy.capacity - energy
			energy += Math.min(data.energy.maxInput, 7, space)
		}
		else if (battery.typeId == "cosmos:creative_battery") {
			const space = data.energy.capacity - energy
			energy += Math.min(data.energy.maxInput, 200, space)
		}
	} return energy
}

export function update_battery(battery, charge) {
	if (battery.typeId != "cosmos:battery") return battery
	battery.setLore([`§r§${Math.floor(charge) >= 10000 ? '2' :
			Math.floor(charge) < 5000 ? '4' : '6'
		}${Math.floor(charge)} gJ/15,000 gJ`])
	battery.getComponent('minecraft:durability').damage = 15000 - Math.floor(charge)
	return battery
}
