import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";
import machines from "./AllMachineBlocks";
import { detach_wires, attach_to_wires } from "../blocks/aluminum_wire";
import { pickaxes } from "../../api/utils";
import { setSolarPanelBlocks } from "./blocks/BasicSolarPanel";

const multi_block_machines = {
	"cosmos:basic_solar_panel": setSolarPanelBlocks
}
export let machine_entities = new Map();

export function get_data(entity) {
	return machines[entity.typeId.replace('cosmos:', '')]
}
function reload_machine(entity){
	const machine_name = entity.typeId.replace('cosmos:', '');
	if (!Object.keys(machines).includes(machine_name)) return;
	if (machine_entities.has(entity.id)) return;
	const block = (machines[machine_name].using_block) ?
		entity.dimension.getBlock(entity.location) :
		undefined;
	if (machines[machine_name].using_block && (!block || block.typeId != entity.typeId)) {
		machine_entities.delete(entity.id);
		entity.remove();
		return;
	}
	const dynamic_object = JSON.parse(entity.getDynamicProperty("machine_data") ?? "{}");
	machine_entities.set(entity.id, { type: machine_name, location: block?.location, machine_data: dynamic_object });
}

function hopper_intercations(block, entity, data) {
	;(()=>{ // drain items out of the output slots
		let hopper; try { hopper = block.below()} catch {} // makes sure it doesn't try pick a block below the world bottom 
		if (hopper?.typeId != "minecraft:hopper") return // it's a hopper
		if (hopper.permutation.getState("toggle_bit")) return // hopper isn't locked
		if (!data.items.output) return // the machine has outputs

		// get the outputs of the machine
		const machine_container = entity.getComponent("inventory").container
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
		const machine_container = entity.getComponent("inventory").container
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
		const machine_container = entity.getComponent("inventory").container
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



function block_entity_access() {
	const players = world.getAllPlayers();
	for (const player of players) {
		if (!player) continue;
		const targetEntity = player.getEntitiesFromViewDirection({
			maxDistance: 6,
			families: ["cosmos"],
			ignoreBlockCollision: true
		})[0]?.entity;
		if (player.isSneaking) {
			if (targetEntity) targetEntity.triggerEvent("cosmos:shrink");
			continue;
		}
		const item = player.getComponent("minecraft:equippable").getEquipment("Mainhand")?.typeId;
		const has_pickaxe = pickaxes.has(item);
		const has_wrench = item === "cosmos:standard_wrench";
		if (has_pickaxe || has_wrench) {
			if (targetEntity) targetEntity.triggerEvent("cosmos:shrink");
		}
	}
}

world.afterEvents.worldLoad.subscribe(() => {
	world.getDims(dimension => dimension.getEntities({includeFamilies: ['cosmos']})).forEach(entity => {reload_machine(entity)});
	system.runInterval(() => {
		if (machine_entities.size === 0) return;
		// give block access every 2 ticks
		if (!(system.currentTick % 2)) block_entity_access();

		machine_entities.forEach((machineData, entityId) => {
			const machineEntity = world.getEntity(entityId);
			const data = machines[machineData.type]
			let using_block = data.using_block;
			if (!machineEntity?.isValid || !using_block) return
			const block = machineEntity.dimension.getBlock(machineData.location)
			// tick the machine
			new data.class(machineEntity, using_block? block: undefined)
			// hopper support every 8 ticks
			if (system.currentTick % 8 == 0) hopper_intercations(block, machineEntity, data)
		});
	});
});



system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('cosmos:machine', {
		beforeOnPlayerPlace(event) {
			const { block, permutationToPlace: perm } = event;
			const machine_name = perm.type.id.replace('cosmos:', '');
			const machine_object = machines[machine_name];
			if(machine_object.multi_block && !multi_block_machines[perm.type.id](block)){event.cancel = true; return;}
			
			system.run(() => {
				const machineEntity = block.dimension.spawnEntity(perm.type.id, block.bottomCenter());
				machineEntity.nameTag = machine_object.ui;
				try { new machine_object.class(machineEntity, block).onPlace() } catch { null }
				const dynamic_object = JSON.parse(machineEntity.getDynamicProperty("machine_data") ?? "{}");
				machine_entities.set(machineEntity.id, { type: machine_name, location: block.location, machine_data: dynamic_object });
				if (perm.getState("cosmos:full")) {
					event.permutationToPlace = perm.withState("cosmos:full", false);
				}
				attach_to_wires(block);
			});
		},
		onPlayerBreak({ block, dimension, brokenBlockPermutation: perm }) {
			detach_wires(block);
			const machineEntity = dimension.getEntities({
				type: perm.type.id,
				location: {
					x: Math.floor(block.location.x) + 0.5,
					y: Math.floor(block.location.y) + 0.5,
					z: Math.floor(block.location.z) + 0.5,
				},
				maxDistance: 0.5,
			})[0];
			if (!machineEntity) return

			const machine_name = machineEntity.typeId.replace('cosmos:', '');
			if(machines[machine_name].multi_block) multi_block_machines[machineEntity.typeId](block, true);

			machine_entities.delete(machineEntity.id);
			const container = machineEntity.getComponent('minecraft:inventory')?.container;
			if (container) {
				for (let i = 0; i < container.size; i++) {
					const itemId = container.getItem(i)?.typeId;
					if (!['cosmos:ui', 'cosmos:ui_button'].includes(itemId)) continue;
					container.setItem(i);
				}
			}
			machineEntity?.kill();
			machineEntity?.remove();
		},
	});
});

world.afterEvents.entityLoad.subscribe(({ entity }) => {
	reload_machine(entity);
});

world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
	const { target: entity, player } = e;
	if (!machine_entities.has(entity.id)) return;
	if (!player.isSneaking) return;

	e.cancel = true;
	const equipment = player.getComponent("equippable");
	const selectedItem = equipment.getEquipment("Mainhand");
	if (!selectedItem) return;

	if (selectedItem.typeId === "minecraft:hopper") {
		const machineBlock = player.dimension.getBlock(entity.location);
		if (machineBlock) {
			const facingDirection = (() => {
				const dx = player.location.x - entity.location.x;
				const dz = player.location.z - entity.location.z;
				if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 1 : 3;
				else return dz > 0 ? 2 : 0;
			})();
			const getAdjacentBlockLocation = (location, facingDirection) => {
				switch (facingDirection) {
					case 0: return { x: location.x, y: location.y, z: location.z - 1 };
					case 1: return { x: location.x + 1, y: location.y, z: location.z };
					case 2: return { x: location.x, y: location.y, z: location.z + 1 };
					case 3: return { x: location.x - 1, y: location.y, z: location.z };
					default: return location;
				}
			};

			const hopperLocation = getAdjacentBlockLocation(machineBlock.location, facingDirection);
			const hopperBlock = player.dimension.getBlock(hopperLocation);

			const hasEntitiesAt = (dimension, location) => {
				const entities = dimension.getEntities({
					location: { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 },
					maxDistance: 0.5,
				});
				return entities.length > 0;
			};

			if (hopperBlock.typeId === "minecraft:air" && !hasEntitiesAt(player.dimension, hopperLocation)) {
				const hopperPermutation = BlockPermutation.resolve("minecraft:hopper")
					.withState("facing_direction", facingDirection);

				system.run(() => {
					hopperBlock.setPermutation(hopperPermutation);
					if (player.getGameMode() !== "Creative") {
						if (selectedItem.amount === 1) {
							equipment.setEquipment("Mainhand", undefined);
						} else {
							selectedItem.amount -= 1;
							equipment.setEquipment("Mainhand", selectedItem);
						}
					}
				});
			}
		}
	}
});

//remove the ui item entities
world.afterEvents.entitySpawn.subscribe((data) => {
	if (data.entity.isValid && data.entity.typeId == "minecraft:item" && data.entity.getComponent("minecraft:item")?.itemStack.typeId == "cosmos:ui") {
		data.entity.remove();
	}
});