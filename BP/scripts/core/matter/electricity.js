import { world } from "@minecraft/server";
import { compare_position, get_entity, location_of_side } from "../../api/utils";
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
	if (connectedMachines && connectedMachines.length > 0 && energy < data.capacity) {
		for (let input_entity_id of connectedMachines) {
			if (world.getEntity(input_entity_id[0]) && input_entity_id[0] != entity.id && input_entity_id[1] == "output") {
				let input_entity = world.getEntity(input_entity_id[0])
				let power = +input_entity.getDynamicProperty("cosmos_power") ?? 0
				let inputs = connectedMachines.filter((input) =>
					input[1] == "input"
				)
				power = (inputs.length > 0) ? Math.floor(power / (inputs.length + 1)) :
					power;
				const space = data.capacity - energy
				if (power > 0) {
					energy += Math.min(data.energy.maxInput, power, space)
					if(Math.min(data.energy.maxInput, power, space) && input_entity.typeId.includes('energy_storage')){
						let final_input_energy = input_entity.getDynamicProperty("cosmos_energy") - power;
						final_input_energy = Math.max(0, final_input_energy)
						input_entity.setDynamicProperty("cosmos_energy", final_input_energy)
						input_entity.setDynamicProperty("cosmos_should_updates", true)
					}
				}
			}
		}
	} else {
		const input_location = location_of_side(block, data.energy.input)
		const input_entity = get_entity(entity.dimension, input_location, "has_power_output")
		if (input_entity && energy < data.capacity) {
			const input_block = entity.dimension.getBlock(input_location)
			const input_data = get_data(input_entity)
			const power = + input_entity.getDynamicProperty("cosmos_power") ?? 0
			const space = data.capacity - energy
			const io = location_of_side(input_block, input_data.energy.output)
			if (compare_position(entity.location, io) && power > 0) {
				energy += Math.min(data.energy.maxInput, power, space)
			}
		}
	} return energy
}

export function charge_from_battery(machine, energy, slot) {
	const data = get_data(machine)
	const container = machine.getComponent('minecraft:inventory').container
	const battery = container.getItem(slot)
	if (battery && energy < data.capacity && (battery.getDynamicProperty('energy') ?? 0) > 0) {
		let charge = battery.getDynamicProperty('energy') ?? 0
		const space = data.capacity - energy
		energy += Math.min(data.energy.maxInput, 200, charge, space)
		charge -= Math.min(data.energy.maxInput, 200, charge, space)
		container.setItem(slot, update_battery(battery, charge))
	} return energy
}

export function update_battery(battery, charge) {
	if (battery.typeId != "cosmos:battery") return battery
	battery.setLore([`§r§${Math.floor(charge) >= 10000 ? '2' :
			Math.floor(charge) < 5000 ? '4' : '6'
		}${Math.floor(charge)} gJ/15,000 gJ`])
	battery.getComponent('minecraft:durability').damage = 15000 - Math.floor(charge)
	battery.setDynamicProperty('energy', Math.floor(charge))
	return battery
}
