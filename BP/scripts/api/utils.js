import * as mc from "@minecraft/server";
import { machine_entities } from "../core/machines/Machine";

export function load_dynamic_object(storage) {
	return machine_entities.get(storage.id)?.machine_data;
}

export function save_dynamic_object(storage, value){
	let machine = machine_entities.get(storage.id);
	if(!machine) return;
	machine.machine_data = value;
	machine_entities.set(storage.id, machine);
	storage.setDynamicProperty("machine_data", JSON.stringify(value)) 
}

export function str(object) { return JSON.stringify(object) }

/**@param {mc.Block[]} locations @param {mc.Dimension} dim */
export const destroyBlocksJOB = function* (locations, dim) {
	for (const loc of locations) {
		dim.runCommand(`setblock ${loc.x} ${loc.y} ${loc.z} air [] destroy`);
		yield;
	}
}

// this function takes a Block and a Side (above, below, left, right, back, or front) and returns a location {x, y, z}
export function location_of_side(block, side) {
	const TURN_BY = {
		front: 0,
		left: Math.PI / 2,
		back: Math.PI,
		right: -Math.PI / 2,
	}
	const ROTATE_BY = {
		west: 0,
		north: Math.PI / 2,
		east: Math.PI,
		south: -Math.PI / 2,
	}
	if (!block || !block.isValid || !side) return
	const { location, permutation } = block
	if (side == "above") return location.y += 1, location
	if (side == "below") return location.y -= 1, location
	const facing = permutation.getState("minecraft:cardinal_direction")
	if (!facing) return
	const direction = ROTATE_BY[facing]
	location.x += Math.round(Math.cos(direction + TURN_BY[side]))
	location.z += Math.round(Math.sin(direction + TURN_BY[side]))
	return location
}

export function get_entity(dimension, location, family) {
	if (!location) return
	return dimension.getEntities({
		families: [family],
		location: {
			x: Math.floor(location.x) + 0.5,
			y: Math.floor(location.y) + 0.5,
			z: Math.floor(location.z) + 0.5,
		},
		maxDistance: 0.5,
	})[0]
}

export const getHand = (() => {
	const handsMap = new WeakMap();
	/**
	 * @param {mc.Entity} source
	 * @returns {mc.ContainerSlot} 'Mainhand' ContainerSlot of the entity
	 **/
	return source => handsMap.get(source) ?? handsMap.set(
		source, source.getComponent("equippable")?.getEquipmentSlot("Mainhand")
	).get(source)

})();

/**@type {<T>(list?: T[])=>T}  */
export function select_random_item(list = []) {
	return list.length ? list[Math.floor(Math.random() * list.length)] : undefined
}

export function compare_lists(list1, list2) {
	for (let i = 0; i < list1.length; i++) {
		if (list1[i] != list2[i]) return false
	} return true
}

export const pickaxes = new Set([
	"minecraft:wooden_pickaxe",
	"minecraft:stone_pickaxe",
	"minecraft:iron_pickaxe",
	"minecraft:golden_pickaxe",
	"minecraft:diamond_pickaxe",
	"minecraft:netherite_pickaxe",
])

// export function delay(ticks) {
//     return new Promise(res => system.runTimeout(res, ticks * 20));
// }
export function isUnderground(player) {
	let block = player.dimension.getTopmostBlock(player.location)
	if (player.location.y >= block.y) return false
	let min = player.dimension.heightRange.min
	while (!block.isSolid && block.y > min) {
		if (player.location.y >= block.y) return false
		block = block.below()
	}
	return true
}

export function compare_position(a, b) {
	if (!a || !b) return false;
	const f = (x) => Math.floor(x)
	return f(a.x) == f(b.x) && f(a.y) == f(b.y) && f(a.z) == f(b.z)
}
export function floor_position({ x, y, z }) {
	return { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
}