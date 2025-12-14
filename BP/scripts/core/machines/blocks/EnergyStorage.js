import { ItemStack } from "@minecraft/server";
import { charge_from_machine, charge_from_battery, charge_battery } from "../../matter/electricity.js";
import { get_data } from "../Machine.js";
import { compare_position, get_entity, load_dynamic_object, save_dynamic_object, compare_lists, location_of_side } from "../../../api/utils.js";

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        if (entity.isValid) this.processEnergy()
    }

	processEnergy() {
		//retrieve data
		const store = this.entity
		const container = this.entity.getComponent('minecraft:inventory').container;
		const store_data = get_data(store)
		const variables = load_dynamic_object(this.entity, "machine_data");
		let energy = variables.energy || 0;
		let power = variables.power || 0;

		let first_values = [energy, power]

		energy = energy ? + energy : 0
		
		energy = charge_from_machine(store, this.block, energy)
		
		energy = charge_battery(store, energy, 0)
		
		energy = charge_from_battery(store, energy, 1)
		
		power = Math.min(energy, store_data.energy.maxPower);
		//store and display data

		save_dynamic_object(this.entity, {energy, power}, "machine_data");
		container.add_ui_display(2, `§r ${energy} gJ\nof ${store_data.energy.capacity} gJ`)
		container.add_ui_display(3, '', Math.ceil((energy/ store_data.energy.capacity) * 75 ))
		
		//change the block look
		 try { if (this.block?.typeId != "minecraft:air") {
			const fill_level = Math.round((energy/ store_data.energy.capacity) * 16 )
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