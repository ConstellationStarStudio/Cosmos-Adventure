import { system, ItemStack } from "@minecraft/server";
import { compare_lists, load_dynamic_object, save_dynamic_object} from "../../../api/utils";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js"
import { find_recipe } from "./Compressor.js";

const InputSlots = Array.from(Array(9).keys()) // 0 to 8
const BatterySlot = 9, OutputSlots = [10, 11]
const EnergyDisplay = 12, ProgressDisplay = 13, StatusDisplay = 14

const data = {
	electric_compressor: {
		onTick: onTick,
		energy: {input: "right", capacity: 16000, maxInput: 187, rate: 75},
		items: {
			top_input: InputSlots,
			side_input: InputSlots,
			output: OutputSlots
		},
		required_time: 200
	},
	advanced_compressor: {
		onTick: onTick,
		energy: {input: "right", capacity: 16000, maxInput: 187, rate: 75},
		items: {
			top_input: InputSlots,
			side_input: InputSlots,
			output: OutputSlots
		},
		required_time: 120
	},
    
};

function onTick(entity, block){
	const container = entity.getComponent('minecraft:inventory').container;
	const variables = load_dynamic_object(entity, "machine_data");
	const compressor_data = data[entity.typeId.replace('cosmos:', '')];
	//this is a tier of wires that power machine not the tier of machine itself
	const tier = load_dynamic_object(entity, "machine_data", "energy_tier")?.level ?? 1;
    const required_time = Math.floor(compressor_data.required_time / (2 + tier * 2));
	let energy = variables.energy || 0;
	let progress = variables.progress || 0;
	let first_values = [energy, progress]
	energy = charge_from_machine(entity, block, energy)
	energy = charge_from_battery(entity, energy, BatterySlot);
	if(!(system.currentTick % 80)) energy -= Math.min(1, energy)
	
	const items = InputSlots.map(slot => container.getItem(slot))
	const ingredients = items.map(item => item?.typeId).filter(i => i).sort()
	const recipe = find_recipe(ingredients)
	const output_items = OutputSlots.map(slot => container.getItem(slot))
	const one_has_space = (oneItemMax) => (!output_items[0] || (output_items[0].typeId == recipe && ((oneItemMax === 64)? output_items[0].amount < oneItemMax: output_items[0].amount <= oneItemMax)))
	const two_has_space = (twoItemMax) => (!output_items[1] || (output_items[1].typeId == recipe && ((twoItemMax === 64)? output_items[1].amount < twoItemMax: output_items[1].amount <= twoItemMax)))
	if (energy > compressor_data.energy.rate && progress < required_time && recipe && (one_has_space(64) || two_has_space(64))) {
		progress++;
		energy -= Math.min(compressor_data.energy.rate, energy);
	}

	if ((energy < compressor_data.energy.rate || (recipe === undefined || (!one_has_space(64) && !two_has_space(64)))) && progress > 0) progress = 0;
	if (progress >= required_time) {
		block.dimension.playSound("random.anvil_land", entity.location)
		progress = 0
		let itemsWithout = items.filter((itemWithout) => itemWithout != undefined)
		let min = itemsWithout[0].amount;
		for (const item of itemsWithout) {
			if(item.amount < min){
				min = item.amount;
			}
		}
		if((min < 2) && (one_has_space(64) || two_has_space(64))){
		for (let i = 0; i < 9; i++){
			if (items[i]) container.setItem(i, items[i].decrementStack(1))
		}
		if(one_has_space(64)){
			if(output_items[0]?.typeId == recipe) {
				container.setItem(OutputSlots[0], output_items[0].incrementStack())
			} else container.setItem(OutputSlots[0], new ItemStack(recipe))
		}
		else if(two_has_space(64) && !one_has_space(64)){
			if(output_items[1]?.typeId == recipe) {
				container.setItem(OutputSlots[1], output_items[1].incrementStack())
			} else container.setItem(OutputSlots[1], new ItemStack(recipe))
		}
		}
		else if((min >= 2) && (one_has_space(63) || two_has_space(63))){
			for (let i = 0; i < 9; i++){
				if (items[i]) container.setItem(i, items[i].decrementStack(2))
			}
			if(one_has_space(63) && two_has_space(63)){
				if(output_items[0]?.typeId == recipe) {
					container.setItem(OutputSlots[0], output_items[0].incrementStack())
				} else container.setItem(OutputSlots[0], new ItemStack(recipe))
				if(output_items[1]?.typeId == recipe) {
					container.setItem(OutputSlots[1], output_items[1].incrementStack())
				} else container.setItem(OutputSlots[1], new ItemStack(recipe))
			}
			else if(one_has_space(63) && !two_has_space(63)){
				if(output_items[0]?.typeId == recipe) {
					container.setItem(OutputSlots[0], output_items[0].incrementStack(63, 2))
				} else container.setItem(OutputSlots[0], new ItemStack(recipe, 2))
			}
			else if(!one_has_space(63) && two_has_space(63)){
				if(output_items[1]?.typeId == recipe) {
					container.setItem(OutputSlots[1], output_items[1].incrementStack(63, 2))
				} else container.setItem(OutputSlots[1], new ItemStack(recipe, 2))
			}
		}
	}
	if(!compare_lists(first_values, [energy, progress]) || !container.getItem(EnergyDisplay)){
		save_dynamic_object(entity, {progress, energy}, "machine_data")
		
		const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${compressor_data.energy.capacity} gJ`
		container.add_ui_display(EnergyDisplay, energy_hover, Math.round((energy / compressor_data.energy.capacity) * 55))
		container.add_ui_display(ProgressDisplay, '', Math.ceil((progress / required_time) * 52))
		container.add_ui_display(StatusDisplay, '§rStatus: ' + (energy <= compressor_data.energy.rate ? '§4No Power' : progress ? '§2Running' : '§6Idle'))
	}
}; export default data;