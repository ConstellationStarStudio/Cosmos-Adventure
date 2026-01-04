import { world, system } from "@minecraft/server";
import { compare_position, get_entity, load_dynamic_object, save_dynamic_object, location_of_side } from "../../api/utils";
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
	let data = get_data(entity);
	if(energy == data.energy.capacity) return energy;
	let machines_in_network = new MachinesInNetwork(entity);
	let connectedMachines = machines_in_network.getInputMachines();
	if (connectedMachines && connectedMachines.length > 0) {
		let inputs = connectedMachines.filter((input) => input[1] != "input" && input[0] != entity.id);
		let connectedMachinesOutput; let outputs; let output_machines;
		//so it needed to avoid double slot energy storage connections
	    if(data.energy.output){
			connectedMachinesOutput = machines_in_network.getOutputMachines();
			if(connectedMachinesOutput){ outputs = connectedMachinesOutput.filter((output) => output[0] != entity.id && output[1] !== "output");}
		}
		for (let input_entity_id of inputs) {
			let input_entity = world.getEntity(input_entity_id[0])
			if(!input_entity) continue;
			//just a fun thing for bugfix
			if(outputs?.length > 0 && data.energy.output && get_data(input_entity).energy.input && outputs.every(element => element[0] == input_entity_id[0])){
				continue;
			}
			let dynamic_object = load_dynamic_object(input_entity, "machine_data");
			let power = input_entity.getDynamicProperty("cosmos_power") ?? dynamic_object.power ?? 0;
			power = (inputs.length > 0) ? Math.floor(power/inputs.length) : power;
			const space = data.energy.capacity - energy
			if (power > 0){ 
				energy += Math.min(data.energy.maxInput, power, space)
				if(dynamic_object.energy){ 
					dynamic_object.energy -= Math.min(data.energy.maxInput, power, space);
					save_dynamic_object(input_entity, dynamic_object, "machine_data")
				}
			}
		}
	} else {
		const input_location = location_of_side(block, data.energy.input)
		const input_entity = get_entity(entity.dimension, input_location, "has_power_output")
		if(!input_entity) return energy;
		const input_block = entity.dimension.getBlock(input_location)
		const input_data = get_data(input_entity)
		let dynamic_object = load_dynamic_object(input_entity, "machine_data");
		const power = input_entity.getDynamicProperty("cosmos_power") ?? dynamic_object.power ?? 0
		const space = data.energy.capacity - energy
		const io = location_of_side(input_block, input_data.energy.output)
		if (compare_position(entity.location, io) && power > 0) {
			energy += Math.min(data.energy.maxInput, power, space)
			if (input_data.energy) {
				dynamic_object.energy -= Math.min(data.energy.maxInput, power, space);
				save_dynamic_object(input_entity, dynamic_object, "machine_data")
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

export function charge_battery(machine, energy, slot) {
	const container = machine.getComponent('minecraft:inventory').container
	const battery = container.getItem(slot);
	let durability = battery?.getComponent('minecraft:durability');
	let battery_capacity = (durability)? durability.maxDurability - durability.damage: 0;

	if (battery && battery.typeId == "cosmos:battery" && energy > 0 && battery_capacity < 15000) {
		let charge = battery_capacity;
		const space = 15000 - charge
		charge += Math.min(200, energy, space)
		energy -= Math.min(200, energy, space)
		container.setItem(slot, update_battery(battery, charge))
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
