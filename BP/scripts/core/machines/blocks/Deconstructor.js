import { system, ItemStack } from "@minecraft/server";
import { load_machine_data, save_machine_data} from "../../../api/utils";
import { recipes } from "../../../recipes/deconstructor.js"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";

const BatterySlot = 9, InputSlot = 10
const EnergyDisplay = 11, ProgressDisplay = 12, StatusDisplay = 13

const data = {
	energy: {input: "right", capacity: 16000, maxInput: 187, rate: 75},
	onTick(block, ui_opened){
		const container = block.getComponent('minecraft:inventory').container;
		const variables = load_machine_data(block);
		let energy = variables.energy || 0;
		let progress = variables.progress || 0;

		energy = charge_from_machine(block, energy)
		energy = charge_from_battery(block, energy, BatterySlot);
		if(!(system.currentTick % 80)) energy -= Math.min(5, energy)

		if(energy > data.energy.rate){
			let recipe_item = container.getItem(InputSlot);
			if (recipe_item){
				progress++;
				energy -= Math.min(data.energy.rate, energy);
			}
			else progress = 0

			if((progress * 5) % 250 == 5) block.dimension.playSound("random.anvil_land", block.location)
			if (progress > 250) {
				progress = 0;
				deconstruct(recipe_item, container);
				container.setItem(InputSlot, recipe_item.decrementStack());
			}
		}else if(progress > 0) progress = 0;

		if(ui_opened || !container.getItem(StatusDisplay)){
			const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`
		    container.add_ui_display(EnergyDisplay, energy_hover, Math.round((energy / data.energy.capacity) * 55))
		    container.add_ui_display(ProgressDisplay, '', Math.ceil((progress / 250) * 52))
		    container.add_ui_display(StatusDisplay, `§r   Status:\n${progress ? '§2Running' : '    §6Idle' }`)
		}

		save_machine_data(block, {progress, energy})
	}
}; export default data

function deconstruct(item, container){
	let pre_recipe = recipes[item.typeId];
	if(!pre_recipe) return;
	pre_recipe = Object.entries(pre_recipe);

	let recipe = [];
	pre_recipe.forEach(element => {
		let rand = Math.random();
		rand = rand > 0.5 ? rand: rand + 0.5;

		const amount = Math.round(element[1] * rand);
		if(amount > 0) recipe.push([element[0], amount]);
	});

	if(!recipe.length) return;

	let current_item = {type: recipe[0][0], amount: recipe[0][1]};
	let offset = 0;
	for(let i = 0; i < 9; i++){
		if(offset + 1 > recipe.length || !recipe[offset]) break;
		
		let slot = container.getItem(i);

		if(!slot){
			container.setItem(i, new ItemStack(current_item.type, current_item.amount));
			offset++;
			current_item = recipe[offset] ? {type: recipe[offset][0], amount: recipe[offset][1]}: undefined;
			continue;
		}else if(slot.typeId == current_item.type){
			let space = 64 - slot.amount;
			if(!space) continue;
			else if(space >= current_item.amount){
				container.setItem(i, new ItemStack(current_item.type, current_item.amount + slot.amount));
				offset++;
				current_item = recipe[offset] ? {type: recipe[offset][0], amount: recipe[offset][1]}: undefined;
			    continue;
			}else{
				container.setItem(i, new ItemStack(current_item.type, slot.amount + space));
				current_item.amount = current_item.amount - space;
			}
		}
	}
}