import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";
import machines from "./AllMachineBlocks";
import { detach_wires, attach_to_wires } from "../blocks/aluminum_wire";
import { pickaxes } from "../../api/utils";

export let machine_entities = new Map();

export function get_data(entity) {
	return machines[entity.typeId.replace('cosmos:', '')]
}


// By Refracted
function moveItemsFromHoppers(object, itemFilter) {
	function sanitizeKey(key) {
		return key.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
	}
	const center = object.dimension.getBlock(object.location);
	const inv = object.getComponent('inventory')?.container;
	if (center == undefined || inv == undefined) return false;

	const offsets = [{ x: 1 }, { x: -1 }, { z: 1 }, { z: -1 }, { y: 1 }]
		.map(offset => ({ x: offset.x || 0, y: offset.y || 0, z: offset.z || 0 }));

	for (let offset of offsets) {
		const block = center.offset(offset);
		if (block == undefined || block.typeId !== 'minecraft:hopper' || block.permutation.getState('toggle_bit')) continue;

		let offsetTo = {
			'2': { z: 1, y: 0, x: 0 },
			'3': { z: -1, y: 0, x: 0 },
			'4': { x: 1, y: 0, z: 0 },
			'5': { x: -1, y: 0, z: 0 },
			'0': { x: 0, y: 1, z: 0 }
		}[block.permutation.getState('facing_direction')] || { x: 0, y: 0, z: 0 };

		if (!['x', 'y', 'z'].every(axis => offsetTo[axis] === offset[axis])) continue;

		const blockInv = block.getComponent('inventory')?.container;
		if (!blockInv) continue;
		for (let i = 0; i < blockInv.size; i++) {
			let item = blockInv.getItem(i);
			if (item == undefined || (itemFilter != undefined && !itemFilter(item))) continue;

			// Attempt to transfer items from this hopper slot to the machine.
			let leftover = blockInv.transferItem(i, inv);

			// If there's leftover (machine slot was occupied), save it.
			if (leftover) {
				let rawKey = `lost_${object.id}_${block.location.x}_${block.location.y}_${block.location.z}_slot${i}`;
				let key = sanitizeKey(rawKey);
				if (itemDatabase.has(key)) {
					let existing = itemDatabase.get(key);
					if (!Array.isArray(existing)) {
						if (existing.typeId === leftover.typeId) {
							let merged = { ...leftover };
							merged.amount = existing.amount + leftover.amount;
							itemDatabase.set(key, merged);
						} else {
							itemDatabase.set(key, [existing, leftover]);
						}
					} else {
						let merged = false;
						for (let j = 0; j < existing.length; j++) {
							if (existing[j].typeId === leftover.typeId) {
								existing[j].amount += leftover.amount;
								merged = true;
								break;
							}
						}
						if (!merged) {
							if (existing.length < 255) {
								existing.push(leftover);
							} else {
								console.warn(`Dropping leftover from key ${key} as maximum array length reached.`);
							}
						}
						itemDatabase.set(key, existing);
					}
				} else {
					itemDatabase.set(key, leftover);
				}
				// Update the hopper slot with the leftover so it isn't lost.
				blockInv.setItem(i, leftover);
			}
		}
	}
	return true;
}
function reinsertion(object, itemDatabase) {
	const inv = object.getComponent("inventory")?.container;
	if (!inv) return;
	// Get all keys from the database for lost items for this machine.
	let keys = itemDatabase.keys().filter(key => key.startsWith(`lost_${object.id}_`));
	for (let key of keys) {
		let lostItem = itemDatabase.get(key);
		// If the stored value is an array, attempt to reinsert each item separately.
		if (Array.isArray(lostItem)) {
			let remaining = [];
			for (let item of lostItem) {
				let notAdded = inv.addItem(item);
				let accepted = item.amount - (typeof notAdded === "number" ? notAdded : 0);
				if (accepted < item.amount) {
					item.amount -= accepted;
					remaining.push(item);
				}
			}
			if (remaining.length === 0) {
				itemDatabase.delete(key);
			} else {
				itemDatabase.set(key, remaining);
			}
		} else {
			let notAdded = inv.addItem(lostItem);
			let accepted = lostItem.amount - (typeof notAdded === "number" ? notAdded : 0);
			if (accepted >= lostItem.amount) {
				itemDatabase.delete(key);
			} else {
				lostItem.amount -= accepted;
				itemDatabase.set(key, lostItem);
			}
		}
	}
}

// By Zahari
function move_items_to_hoppers(machine, container, hopper_slots) {
	let slot_index = hopper_slots.find((element) => container.getItem(element) != undefined);
	if (!slot_index) return;

	let item_slot = container.getItem(slot_index);
	let { x, y, z } = machine.location;
	let hopper = machine.dimension.getBlock({ x: x, y: y - 1, z: z });

	if (hopper.typeId == "minecraft:hopper") {
		let hopper_item_slot = item_slot.clone();
		hopper_item_slot.amount = 1;

		if (!(item_slot.amount - 1)) item_slot = undefined;
		let item_in_hopper = hopper.getComponent("minecraft:inventory").container.addItem(hopper_item_slot);
		item_slot?.decrementStack();

		if (!item_in_hopper) container.setItem(slot_index, item_slot);
	}
}

// By Yasser444
function hopper_intercations(block, entity, data) {
	;(()=>{ // drain items out of the output slots
		let hopper; try { hopper = block.below()} catch {}
		if (hopper?.typeId != "minecraft:hopper") return
		if (!data.item_outputs) return

		const machine_container = entity.getComponent("inventory").container
		const outputs = data.item_outputs.map(i => ({slot: i, item: machine_container.getItem(i)}))

		// find the first output slot that isn't empty
		const first_output = outputs.find(output => output.item)
		if (!first_output) return
		
		const item_to_move = new ItemStack(first_output.item.typeId, 1)
		const moved_item = first_output.item.decrementStack()

		const hopper_container = hopper.getComponent("inventory").container
		const managed_to_move = !hopper_container.addItem(item_to_move) // container.addItem adds an item to the hopper if it has space for it or returns the item it tried to move
		if (managed_to_move) machine_container.setItem(first_output.slot, moved_item)	
	})()
	;(()=>{ // send items to the top of the machine
		null
	})()
	;(()=>{ // send items to the side of the machine
		null
	})()
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
			system.run(() => {
				const { block, permutationToPlace: perm } = event;
				const machine_name = perm.type.id.replace('cosmos:', '');
				const machine_object = machines[machine_name];
				const machineEntity = block.dimension.spawnEntity(perm.type.id, block.bottomCenter());
				machineEntity.nameTag = machine_object.ui;
				try { new machine_object.class(machineEntity, block).onPlace() } catch { null }
				machine_entities.set(machineEntity.id, { type: machine_name, location: block.location });
				if (perm.getState("cosmos:full")) {
					event.permutationToPlace = perm.withState("cosmos:full", false);
				}
				system.run(() => attach_to_wires(block));
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
	const machine_name = entity.typeId.replace('cosmos:', '');
	if (!Object.keys(machines).includes(machine_name)) return;
	if (machine_entities.has(entity.id)) return;
	const block = (machines[machine_name].using_block) ?
		entity.dimension.getBlock(entity.location) :
		undefined;
	if (machines[machine_name].using_block && block.typeId != entity.typeId) {
		machine_entities.delete(entity.id);
		entity.remove();
		return;
	}
	new machines[machine_name].class(entity, block);
	machine_entities.set(entity.id, { type: machine_name, location: block?.location });
});

/*world.afterEvents.worldInitialize.subscribe(() => {
  world.getDims(dimension => dimension.getEntities()).forEach(entity => {
	const machine_name = entity.typeId.replace('cosmos:', '');
	if (!Object.keys(machines).includes(machine_name)) return;
	const block = entity.dimension.getBlock(entity.location);
	if (block.typeId != entity.typeId) {
	  machine_entities.delete(entity.id);
	  entity.remove();
	  return;
	}
	new machines[machine_name].class(entity, block);
	machine_entities.set(entity.id, { type: machine_name, location: block.location });
  });
});
//doesn't make sense
*/



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
	if (data.entity.typeId == "minecraft:item" && data.entity.getComponent("minecraft:item")?.itemStack.typeId == "cosmos:ui") {
		data.entity.remove();
	}
});