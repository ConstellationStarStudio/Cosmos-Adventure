import { system, ItemStack } from "@minecraft/server";
import { compare_lists, load_dynamic_object, save_dynamic_object} from "../../../api/utils";
import recipes from "../../../recipes/electric_furnace"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { get_data } from "../Machine.js";

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        if (entity.isValid) this.smelt()
    }

    smelt(){
		const container = this.entity.getComponent('minecraft:inventory').container;
		const data = get_data(this.entity);
		const variables = load_dynamic_object(this.entity);
		let energy = variables.energy || 0
		let progress = variables.progress || 0
		let first_values = [energy, progress]
		energy = charge_from_machine(this.entity, this.block, energy)
		energy = charge_from_battery(this.entity, energy, 1);
        if(!(system.currentTick % 80)) energy -= Math.min(1, energy)
		if(energy >= 45){
			let input = container.getItem(0);
			let output = container.getItem(2);
			let outputId = recipes[input?.typeId];
			if(input && outputId && (!output || (output?.typeId == outputId && output?.amount < 64))){
				if (progress < 200){
					progress += 1;
					energy = Math.max(0, energy - 45);
				} else{
					progress = 0;
					output = (output)? output.incrementStack():
					new ItemStack(outputId);
					container.setItem(0, input.decrementStack())
					container.setItem(2, output);
				}
			} else{
				progress = Math.max(progress - 1, 0);
			}
		} else{
			progress = Math.max(progress - 1, 0);
		}

		if(!compare_lists(first_values, [energy, progress]) || !container.getItem(3)){
			save_dynamic_object(this.entity, {energy, progress});
			const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`
			container.add_ui_display(3, energy_hover, Math.round((energy / data.energy.capacity) * 55))
			container.add_ui_display(4, '', Math.ceil((progress / 200) * 24))
			container.add_ui_display(5, '§rStatus: ' + (!energy ? '\n§4No Power' : progress ? '\n§2Running' : '\n§6Idle'))
		}
    }
}
