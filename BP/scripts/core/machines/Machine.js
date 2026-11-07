import { world, system, ItemStack } from "@minecraft/server";
import machines from "./AllMachineBlocks";
import { detach_wires, attach_to_wires } from "../blocks/aluminum_wire";
import { attach_pipes, detach_pipes } from "../blocks/fluid_pipe";
import { setSolarPanelBlocks } from "./blocks/SolarPanel"; 

const multi_block_machines = {
	"cosmos:basic_solar_panel": setSolarPanelBlocks,
	"cosmos:advanced_solar_panel": setSolarPanelBlocks
}

export function get_data(machine) {
	return machines[machine.typeId.replace('cosmos:', '')]
}

function hopper_interactions(block, data) {
	;(()=>{ // drain items out of the output slots
		let hopper; try { hopper = block.below()} catch {} // makes sure it doesn't try pick a block below the world bottom 
		if (hopper?.typeId != "minecraft:hopper") return // it's a hopper
		if (hopper.permutation.getState("toggle_bit")) return // hopper isn't locked
		if (!data.items.output) return // the machine has outputs

		// get the outputs of the machine
		const machine_container = block.getComponent("inventory").container
		const hopper_container = hopper.getComponent("inventory").container
		const outputs = data.items.output.map(i => ({slot: i, item: machine_container.getItem(i)}))

		// find the first output slot that isn't empty
		const first_output = outputs.find(output => output.item)
		if (!first_output) return
		
		// create the new item stacks for the machine and the hopper 
		const item_to_move = new ItemStack(first_output.item.typeId, 1)
		const moved_item = first_output.item.decrementStack()

		// update the items of the machine and the hopper
		const managed_to_move = !hopper_container.addItem(item_to_move) // container.addItem adds an item to the hopper if it has space for it or returns the item it tried to move
		if (managed_to_move) machine_container.setItem(first_output.slot, moved_item)	
	})()
	;(()=>{ // send items to the top of the machine
		let hopper; try { hopper = block.above()} catch {} // makes sure it doesn't try to get a block above the build limit
		if (hopper?.typeId != "minecraft:hopper") return // it's a hopper
		if (hopper.permutation.getState("toggle_bit")) return // not a locked hopper
		if (hopper.permutation.getState("facing_direction") != 0) return // hopper is pointing down down
		if (!data.items.top_input) return // the machine has inputs

		// get the first item in the hopper
		const hopper_container = hopper.getComponent("inventory").container
		const hopper_slot = hopper_container.firstItem()
		if (hopper_slot == undefined) return
		const item_to_move = hopper_container.getItem(hopper_slot)
		if (!item_to_move) return
		
		// get the inputs of the machine
		const machine_container = block.getComponent("inventory").container
		const inputs = data.items.top_input.map(i => ({slot: i, item: machine_container.getItem(i)}))

		// check if the machine inputs have space
		let receiving_slot
		if (inputs.some(input => { // check if at least one slot passes and set it as the recievng slot
			if (!input.item) {receiving_slot = input.slot; return true} // pass if the slot is empty
			if (!input.item.isStackableWith(item_to_move)) return false // return if the items don't stack
			if (input.item.amount + 1 <= input.item.maxAmount) {receiving_slot = input.slot; return true} // pass if the item doesn't exceed the stack sise
		})) {
			// update the item of the hopper and mahcine
			hopper_container.setItem(hopper_slot, item_to_move.decrementStack())
			machine_container.setItem(receiving_slot, machine_container.getItem(receiving_slot)?.incrementStack() ?? new ItemStack(item_to_move.typeId))
		}
	})()
	const send_to_side = (direction) => { // send items to the side of the machine
		let hopper; try { hopper = block[direction]()} catch {} // makes sure it doesn't try to get a block from an unloaded chunk
		if (hopper?.typeId != "minecraft:hopper") return // it's a hopper
		if (hopper.permutation.getState("toggle_bit")) return // not a locked hopper
		if (hopper.permutation.getState("facing_direction") != {north: 3, east: 4, south: 2, west: 5}[direction]) return // hopper is pointing down down
		if (!data.items.side_input) return // the machine has side inputs
		
		// get the first item in the hopper
		const hopper_container = hopper.getComponent("inventory").container
		const hopper_slot = hopper_container.firstItem()
		if (hopper_slot == undefined) return
		const item_to_move = hopper_container.getItem(hopper_slot)
		if (!item_to_move) return
		
		// get the side inputs of the machine
		const machine_container = block.getComponent("inventory").container
		const inputs = data.items.side_input.map(i => ({slot: i, item: machine_container.getItem(i)}))

		// check if the machine inputs have space
		let receiving_slot
		if (inputs.some(input => { // check if at least one slot passes and set it as the recievng slot
			if (!input.item) {receiving_slot = input.slot; return true} // pass if the slot is empty
			if (!input.item.isStackableWith(item_to_move)) return false // return if the items don't stack
			if (input.item.amount + 1 <= input.item.maxAmount) {receiving_slot = input.slot; return true} // pass if the item doesn't exceed the stack sise
		})) {
			// update the item of the hopper and mahcine
			hopper_container.setItem(hopper_slot, item_to_move.decrementStack())
			machine_container.setItem(receiving_slot, machine_container.getItem(receiving_slot)?.incrementStack() ?? new ItemStack(item_to_move.typeId))
		}
	}
	;["north", "east", "south", "west"].forEach(direction => send_to_side(direction))
}

export const machine_component = {
	beforeOnPlayerPlace(event) {
		const { block, permutationToPlace: perm } = event;
		const machine_name = perm.type.id.replace('cosmos:', '');
		const machine_object = machines[machine_name];
		if(machine_object.multi_block && !multi_block_machines[perm.type.id](block)){event.cancel = true; return;}
		
		system.run(() => {
			if (typeof machine_object.onPlace == 'function') machine_object.onPlace(block)
			if (perm.getState("cosmos:full")) {
				event.permutationToPlace = perm.withState("cosmos:full", false);
			}
			attach_to_wires(block);
			attach_pipes(block)
		});
	},
	onTick(event){
		const { block } = event;
		const machine_name = block.typeId.replace('cosmos:', '');
		const machine_object = machines[machine_name];
		let ui_opened = block.getComponent("minecraft:dynamic_properties").get("active_ui");
		machine_object.onTick(event.block, ui_opened);
		if (system.currentTick % 8 == 0) hopper_interactions(block, machine_object)
	},
	onPlayerBreak({ block, dimension, brokenBlockPermutation: perm }) {
		detach_wires(block);
		detach_pipes(block, perm, undefined, "machine");

		const machine_name = perm.type.id.replace('cosmos:', '');
		if(machines[machine_name].multi_block) multi_block_machines[perm.type.id](block, true);

		if(machines[machine_name].visual_entity){
			let entity = dimension.getEntities({type: perm.type.id, location: { x: Math.floor(block.location.x) + 0.5, y: Math.floor(block.location.y) + 0.5,
				z: Math.floor(block.location.z) + 0.5,
			}, maxDistance: 0.5,})[0];
			if(entity) entity.remove();
		}
	},
}

//remove the ui item entities
world.afterEvents.entitySpawn.subscribe((data) => {
	if (data.entity.isValid && data.entity.typeId == "minecraft:item" && data.entity.getComponent("minecraft:item")?.itemStack.typeId == "cosmos:ui") {
		data.entity.remove();
	}
});

world.afterEvents.blockContainerOpened.subscribe(({block}) => {
	let dm = block.getComponent("minecraft:dynamic_properties");
	let active_ui = dm.get("active_ui");
	active_ui = active_ui ? active_ui + 1: 1;
	dm.set("active_ui", active_ui);
}, {blockFilter: {includeTags: ["machine"]}});

world.afterEvents.blockContainerClosed.subscribe(({block}) => {
	let dm = block.getComponent("minecraft:dynamic_properties");
	let active_ui = dm.get("active_ui");
	if(active_ui === undefined) return;
	active_ui -= 1;
	if(block.active_ui <= 0) active_ui = undefined;
	dm.set("active_ui", active_ui);
}, {blockFilter: {includeTags: ["machine"]}});