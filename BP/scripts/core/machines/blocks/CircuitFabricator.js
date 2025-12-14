import { ItemStack } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import recipes from "../../../recipes/circuit_fabricator.js"
import { compare_lists, load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";
import { get_data } from "../Machine.js";

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        if (entity.isValid) this.fabricate()
    }
    fabricate() {
        const container = this.entity.getComponent('minecraft:inventory').container
		const data = get_data(this.entity)
		const materials = [0, 1, 2, 3].map(i=> container.getItem(i))
		const [raw_item, output_item] = [4,6].map(i=> container.getItem(i))
		const result = recipes.get(raw_item?.typeId)
		const has_space = !output_item || (result && output_item.typeId == result[0] && result[1] + output_item.amount <= 64)
		const is_loaded = compare_lists(materials.map(i=> i?.typeId), [
			"minecraft:diamond",
			"cosmos:raw_silicon",
			"cosmos:raw_silicon",
			"minecraft:redstone"
		])

		const variables = load_dynamic_object(this.entity, "machine_data")
		let energy = variables.energy || 0
		let progress = variables.progress || 0

		let first_values = [energy, progress]
		
	    energy = charge_from_machine(this.entity, this.block, energy)
		
		energy = charge_from_battery(this.entity, energy, 5)
		
		if (is_loaded && result && has_space && energy > 0 && progress < 150) {
			progress++
			energy -= Math.min(20, energy)
		}
		
		if ((!has_space || energy == 0) && progress > 0) progress--
		
		if (!is_loaded || !result) progress = 0
		
		if (progress == 150) {
			progress = 0
			container.setItem(4, raw_item.decrementStack())
			for (let i=0; i<4; i++) {
				container.setItem(i, materials[i].decrementStack())
			}
			if (output_item?.typeId == result[0]) {
				output_item.amount += result[1]
				container.setItem(6, output_item)
			} else container.setItem(6, new ItemStack(result[0], result[1]));
			this.block.dimension.playSound("random.anvil_land", this.entity.location)
		}

		save_dynamic_object(this.entity, {energy, progress}, "machine_data")
		if(!compare_lists(first_values, [energy, progress]) || !container.getItem(7)){
			const energy_hover = `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`
			container.add_ui_display(7, energy_hover, Math.round((energy / data.energy.capacity) * 55))
			container.add_ui_display(8, `Progress: ${Math.round((progress / 150) * 100)}%`, Math.round((progress / 150) * 51))
			container.add_ui_display(9, `§r Status:\n${!energy ? '§4No Power' : progress ? '§2Running' : '   §6Idle'}`)
		}
	}
}

