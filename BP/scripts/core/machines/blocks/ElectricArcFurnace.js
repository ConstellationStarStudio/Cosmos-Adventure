import { system, ItemStack } from "@minecraft/server";
import { compare_lists, load_dynamic_object, save_dynamic_object} from "../../../api/utils";
import recipes from "../../../recipes/electric_furnace"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";

const data = {
	energy: {input: "right", capacity: 25000, maxInput: 90},
	items: {
		top_input: [0],
		side_input: [0],
		output: [2, 3]
	},
	onTick(entity, block) {
		const container = entity.getComponent('minecraft:inventory').container;
		const variables = load_dynamic_object(entity, "machine_data");
		let energy = variables.energy || 0
		let progress = variables.progress || 0
		let first_values = [energy, progress]
		energy = charge_from_machine(entity, block, energy)
		energy = charge_from_battery(entity, energy, 1);
		if(!(system.currentTick % 80)) energy -= Math.min(1, energy)
		
		if(energy >= 90){
			let input = container.getItem(0);
			let outputId = recipes[input?.typeId];
			
			if(input && outputId){
				let isDouble = false;
				let outName = outputId.split(':')[1] || outputId;
				let inName = input.typeId.split(':')[1] || input.typeId;
				
				if ((outName.includes("ingot") || outName === "quartz") && 
					(inName.includes("ore") || inName.includes("raw") || inName.includes("moon") || inName.includes("mars") || inName.includes("shard"))) {
					isDouble = true;
				}
				
				let outputCount = isDouble ? 2 : 1;
				
				let out2 = container.getItem(2);
				let out3 = container.getItem(3);
				
				let space2 = 0;
				let space3 = 0;
				
				if (!out2) space2 = 64;
				else if (out2.typeId === outputId) space2 = 64 - out2.amount;
				
				if (!out3) space3 = 64;
				else if (out3.typeId === outputId) space3 = 64 - out3.amount;
				
				if (space2 + space3 >= outputCount) {
					if (progress < 100){
						progress += 1;
						energy = Math.max(0, energy - 90);
					} else {
						progress = 0;
						container.setItem(0, input.decrementStack());
						
						let remainingToGive = outputCount;
						
						if (space2 > 0 && remainingToGive > 0) {
							let toGive2 = Math.min(space2, remainingToGive);
							if (out2) {
								out2.amount += toGive2;
							} else {
								out2 = new ItemStack(outputId, toGive2);
							}
							container.setItem(2, out2);
							remainingToGive -= toGive2;
						}
						
						if (space3 > 0 && remainingToGive > 0) {
							let toGive3 = Math.min(space3, remainingToGive);
							if (out3) {
								out3.amount += toGive3;
							} else {
								out3 = new ItemStack(outputId, toGive3);
							}
							container.setItem(3, out3);
							remainingToGive -= toGive3;
						}
					}
				} else {
					progress = Math.max(progress - 1, 0);
				}
			} else {
				progress = Math.max(progress - 1, 0);
			}
		} else {
			progress = Math.max(progress - 1, 0);
		}

		if(!compare_lists(first_values, [energy, progress]) || !container.getItem(4)){
			save_dynamic_object(entity, {energy, progress}, "machine_data");
			const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`
			container.add_ui_display(4, energy_hover, Math.round((energy / data.energy.capacity) * 55))
			container.add_ui_display(5, '', Math.ceil((progress / 100) * 22))
			container.add_ui_display(6, '§rStatus: ' + (!energy ? '\n§4No Power' : progress ? '\n§2Running' : '\n§6Idle'))
		}
	}
}; export default data
