import { ItemStack } from "@minecraft/server";
import { charge_from_machine, charge_from_battery, update_battery, } from "../../matter/electricity.js";
import { get_data } from "../Machine.js";
import { compare_position, get_entity, load_dynamic_object, location_of_side } from "../../../api/utils.js";

function charge_battery(machine, energy, slot) {
	const container = machine.getComponent('minecraft:inventory').container
	const battery = container.getItem(slot)
	if (battery && energy > 0 && (battery.getDynamicProperty('energy') ?? 0) < 15000 ) {
		let charge = battery.getDynamicProperty('energy') ?? 0
		const space = 15000 - charge
		charge += Math.min(200, energy, space)
		energy -= Math.min(200, energy, space)
		container.setItem(slot, update_battery(battery, charge))
	} return energy
}

function charge_machine(entity, block, energy) {
	const data = get_data(entity)
	const output_location = location_of_side(block, data.energy.output)
	const output_entity = get_entity(entity.dimension, output_location, "has_power_input")
	if (!output_entity || energy == 0) return energy //check if it has energy to give and if there is a machine to give energy to
	
	const output_capacity = get_data(output_entity).energy.capacity
	const output_energy = load_dynamic_object(output_entity, 'machine_data')?.energy ?? output_entity.getDynamicProperty("cosmos_energy") ?? 0
	if (output_energy == output_capacity) return energy //check if the output machine has room from more energy

	const output_block = entity.dimension.getBlock(output_location)
	const output_data = get_data(output_entity)
	const oi = location_of_side(output_block, output_data.energy.input)
	if (!compare_position(entity.location, oi)) return energy //check if this machine is placed at the energy input of the output machine

	const max_power = data.maxPower
	const max_input = output_data.energy.maxInput
	const space = output_capacity - output_energy

	return energy - Math.min(energy, max_power, max_input, space)
}

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        if (entity.isValid()) this.processEnergy()
    }

	onPlace(){
		const container = this.entity.getComponent('minecraft:inventory').container
		const store_data = get_data(this.entity);
		const counter = new ItemStack('cosmos:ui')
		counter.nameTag = `cosmos:§. ${0} gJ\nof ${store_data.energy.capacity} gJ`
		container.setItem(2, counter)
		counter.nameTag = `cosmos:f${Math.ceil((0/ store_data.energy.capacity) * 75 )}`
		container.setItem(3, counter)
	}
	processEnergy() {
		//retrieve data
		const store = this.entity
		const container = this.entity.getComponent('minecraft:inventory').container;
		const store_data = get_data(store)
		let energy = this.entity.getDynamicProperty("cosmos_energy");
		let should_updates = this.entity.getDynamicProperty("cosmos_should_updates");
		energy = energy ? + energy : 0

		let first_energy = energy;
		
		energy = charge_machine(store, this.block, energy)
		
		energy = charge_from_machine(store, this.block, energy)
		
		energy = charge_battery(store, energy, 0)
		
		energy = charge_from_battery(store, energy, 1)
		
		//store and display data

		if(energy !== first_energy || should_updates){
			this.entity.setDynamicProperty("cosmos_energy", energy);
			this.entity.setDynamicProperty("cosmos_power", Math.min(energy, store_data.maxPower));
			this.entity.setDynamicProperty("cosmos_should_updates");
			const counter = new ItemStack('cosmos:ui')
			counter.nameTag = `cosmos:§. ${energy} gJ\nof ${store_data.capacity} gJ`
			container.setItem(2, counter)
			counter.nameTag = `cosmos:f${Math.ceil((energy/ store_data.capacity) * 75 )}`
			container.setItem(3, counter)
		}
		
		//change the block look
		 try { if (this.block?.typeId != "minecraft:air") {
			const fill_level = Math.round((energy/ store_data.capacity) * 16 )
			if (fill_level == 16) {
				this.block.setPermutation(this.block.permutation
					.withState("cosmos:fill_level", 0)
					.withState("cosmos:full", true)
				)
			} else 
			this.block.setPermutation(this.block.permutation
				.withState("cosmos:fill_level", fill_level)
				.withState("cosmos:full", false)
			)
		}} catch {null}
	}
}