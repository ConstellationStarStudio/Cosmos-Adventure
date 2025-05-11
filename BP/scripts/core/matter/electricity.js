import { world } from "@minecraft/server";
import AllMachineBlocks from "../machines/AllMachineBlocks"
import { compare_position, floor_position } from "../../api/utils";
export function get_data(machine) { return AllMachineBlocks[machine.typeId.replace('cosmos:', '')] }
function str(object) { return JSON.stringify(object) }
function say(message = 'yes') { world.sendMessage('' + message) }
export class MachinesInNetwork {
	constructor(machine) {
		this.machine = machine;
	}
	getInputMachines() {
		if (this.machine.getDynamicProperty("input_connected_machines")) return JSON.parse(this.machine.getDynamicProperty("input_connected_machines"))
		return undefined;
	}
	getOutputMachines() {
		if (this.machine.getDynamicProperty("output_connected_machines")) return JSON.parse(this.machine.getDynamicProperty("output_connected_machines"))
		return undefined;
	}
}
export function get_entity(dimension, location, family) {
	if (!location) return
	return dimension.getEntities({
		families: [family],
		location: {
			x: Math.floor(location.x) + 0.5,
			y: Math.floor(location.y) + 0.5,
			z: Math.floor(location.z) + 0.5,
		},
		maxDistance: 0.5,
	})[0]
}

export function charge_from_machine(entity, block, energy) {
	const data = get_data(entity)
	let connectedMachines = new MachinesInNetwork(entity).getInputMachines();
	if (connectedMachines && connectedMachines.length > 0 && energy < data.capacity) {
		for (let input_entity_id of connectedMachines) {
			if (world.getEntity(input_entity_id[0]) && input_entity_id[0] != entity.id && input_entity_id[1] == "output") {
				let input_entity = world.getEntity(input_entity_id[0])
				const lore = input_entity.getDynamicProperty("cosmos_power")
				let power = lore ? + lore : 0
				let inputs = connectedMachines.filter((input) =>
					input[1] == "input"
				)
				power = (inputs.length > 0) ? Math.floor(power / (inputs.length + 1)) :
					power;
				const space = data.capacity - energy
				if (power > 0) {
					energy += Math.min(data.maxInput, power, space)
					if(Math.min(data.maxInput, power, space) && input_entity.typeId.includes('energy_storage')){
						let final_input_energy = input_entity.getDynamicProperty("cosmos_energy") - power;
						final_input_energy = Math.max(0, final_input_energy)
						input_entity.setDynamicProperty("cosmos_energy", final_input_energy)
						input_entity.setDynamicProperty("cosmos_should_updates", true)
					}
				}
			}
		}
	} else {
		const input_location = location_of_side(block, data.energy_input)
		const input_entity = get_entity(entity.dimension, input_location, "has_power_output")
		if (input_entity && energy < data.capacity) {
			const input_block = entity.dimension.getBlock(input_location)
			const input_data = get_data(input_entity)
			const lore = input_entity.getDynamicProperty("cosmos_power")
			const power = lore ? + lore : 0
			const space = data.capacity - energy
			const io = location_of_side(input_block, input_data.energy_output)
			if (compare_position(floor_position(entity.location), io) && power > 0) {
				energy += Math.min(data.maxInput, power, space)
				if(Math.min(data.maxInput, power, space) !== 0 && input_entity.typeId.includes('energy_storage')){
					let final_input_energy = input_entity.getDynamicProperty("cosmos_energy") - power;
					final_input_energy = Math.max(0, final_input_energy)
					input_entity.setDynamicProperty("cosmos_energy", final_input_energy)
					input_entity.setDynamicProperty("cosmos_should_updates", true)
				}
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
		energy += Math.min(data.maxInput, 200, charge, space)
		charge -= Math.min(data.maxInput, 200, charge, space)
		container.setItem(slot, update_battery(battery, charge))
	} return energy
}

const TURN_BY = {
	front: 0,
	left: Math.PI / 2,
	back: Math.PI,
	right: -Math.PI / 2,
}
const ROTATE_BY = {
	west: 0,
	north: Math.PI / 2,
	east: Math.PI,
	south: -Math.PI / 2,
}

// this function takes a Block and a Side (above, below, left, right, back, or front) and returns a location {x, y, z}
export function location_of_side(block, side) {
	if (!block || !block.isValid() || !side) return
	const { location, permutation } = block
	if (side == "above") return location.y += 1, location
	if (side == "below") return location.y -= 1, location
	const facing = permutation.getState("minecraft:cardinal_direction")
	if (!facing) return
	const direction = ROTATE_BY[facing]
	location.x += Math.round(Math.cos(direction + TURN_BY[side]))
	location.z += Math.round(Math.sin(direction + TURN_BY[side]))
	return location
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
