import { system, ItemStack } from "@minecraft/server";
import { compare_lists, load_dynamic_object, save_dynamic_object} from "../../../api/utils";
import recipes from "../../../recipes/electric_furnace"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import electric_furnace from "../../../recipes/electric_furnace";

const data = {
	electric_furnace: {
		energy: {input: "right", capacity: 16000, maxInput: 112, rate: 45},
		items: {
			top_input: [0],
			side_input: [0],
			output: [2]
		},
		tier: 1,
		onTick: onTick
	},
	electric_arc_furnace: {
		energy: {input: "right", capacity: 25000, maxInput: 150, rate: 60},
		items: {
			top_input: [0],
			side_input: [0],
			output: [2]
		},
		tier: 2,
		onTick: onTick
	}
}; 


function onTick(entity, block) {
	const container = entity.getComponent('minecraft:inventory').container;
	const variables = load_dynamic_object(entity, "machine_data");
	const furnace_data = data[entity.typeId.replace('cosmos:', '')];
	let energy = variables.energy || 0
	let progress = variables.progress || 0
	let first_values = [energy, progress]
	energy = charge_from_machine(entity, block, energy)
	energy = charge_from_battery(entity, energy, 1);

	let required_time = (furnace_data.tier == 2)? 100: 130;
	if(furnace_data.tier == 2){
		const tier = load_dynamic_object(entity, "machine_data", "energy_tier")?.level ?? 1;
		required_time = Math.floor(required_time / 2 / tier)
	}

	if(!(system.currentTick % 80)) energy -= Math.min(1, energy)

	if(energy > furnace_data.energy.rate){
		let input = container.getItem(0);
		let outputs = [container.getItem(5)];
		if(furnace_data.tier == 2) outputs.push(container.getItem(6));
		let outputId = recipes[input?.typeId];

		let condition = false;
		for(let item of outputs){
			if(!item || (item?.typeId == outputId && item?.amount < 64)) condition = true;
			else{ condition = false; break; }
		}
		
		if(input && outputId && condition){
			if (progress < required_time){
				progress += 1;
				energy = Math.max(0, energy - furnace_data.energy.rate);
			}else{
				progress = 0;
				container.setItem(0, input.decrementStack());
			    for(let [index, output] of outputs.entries()){
					output = (output)? output.incrementStack():
				    new ItemStack(outputId);
					container.setItem(5 + index, output);
				}
			}
		} else{
			progress = Math.max(progress - 1, 0);
		}
	} else{
		if(progress > 0) progress = Math.max(progress - 1, 0);
	}

	if(!compare_lists(first_values, [energy, progress]) || !container.getItem(4)){
		save_dynamic_object(entity, {energy, progress}, "machine_data");
		const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${furnace_data.energy.capacity} gJ`
		container.add_ui_display(2, energy_hover, Math.round((energy / furnace_data.energy.capacity) * 55))
		container.add_ui_display(3, '', Math.ceil((progress / required_time) * 24))
		container.add_ui_display(4, '§rStatus: ' + (energy <= furnace_data.energy.rate ? '\n§4No Power' : progress ? '\n§2Running' : '\n§6Idle'))
	}
}; export default data;