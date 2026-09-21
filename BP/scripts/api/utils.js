// This file is for general Utility functions only.

import {machine_entities} from "../core/machines/Machine";
import {vehicles} from "../core/vehicles/Vehicle";
import { multi_blocks } from "../core/mullti_blocks/MultiBlock";
import ALL_PLANETS from "../planets/AllPlanets";

const data_maps = {
	"machine_data": machine_entities,
	"vehicle_data": vehicles,
	"multi_block_data": multi_blocks
}
export function load_dynamic_object(storage, type, name = 'variables'){
	const data = data_maps[type].get(storage.id)?.entity_data[name];
	return data ?? {};
}

export function save_dynamic_object(storage, value, type, name = 'variables'){
	let entity = data_maps[type].get(storage.id);
	if(!entity) return;
	entity.entity_data = entity.entity_data ?? {};
	entity.entity_data[name] = value;
	data_maps[type].set(storage.id, entity);
	storage.setDynamicProperty(type, JSON.stringify(entity.entity_data)) 
}

export function str(object) { return JSON.stringify(object) }

const four_neighbors_array = ["north", "east", "west", "south"]
export function four_neighbors(block) {
	const blocks = {}
	four_neighbors_array.forEach(side => blocks[side] = block[side]())
	return blocks
}

const six_neighbors_array = ["above", "north", "east", "west", "south", "below"]
export function six_neighbors(block) {
	const blocks = {}
	six_neighbors_array.forEach(side => blocks[side] = block[side]())
	return blocks
}

// this function takes a Block and a Side (above, below, left, right, back, or front) and returns a location {x, y, z}
const TURN_BY = { front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }
const ROTATE_BY = { north: Math.PI / 2, east: Math.PI, south: -Math.PI / 2, west: 0 }
export function location_of_side(block, side) {
	if (!block || !block.isValid || !side) return
	const { location, permutation } = block
	if (side == "above") return location.y++, location
	if (side == "below") return location.y--, location
	const facing = permutation.getState("minecraft:cardinal_direction")
	if (!facing) return
	const direction = ROTATE_BY[facing]
	location.x += Math.round(Math.cos(direction + TURN_BY[side]))
	location.z += Math.round(Math.sin(direction + TURN_BY[side]))
	return location
}

export function get_entity(dimension, location, family) {
	if (location) return dimension.getEntities({
		families: [family],
		location: {
			x: Math.floor(location.x) + 0.5,
			y: Math.floor(location.y) + 0.5,
			z: Math.floor(location.z) + 0.5,
		},
		maxDistance: 0.5,
	})[0]
}


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
	if (player.location.y >= block.location.y) return false
	/*commented until isSolid release 
	let min = player.dimension.heightRange.min
	while (!block.isSolid && block.location.y > min) {
		if (player.location.y >= block.location.y) return false
		block = block.below()
	}
	*/
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
export function getPlanetByLocation(location){
    let {x, y, z} = location;
    return ALL_PLANETS.find((planet) => (
        x >= planet.range.start.x && x <= planet.range.end.x && 
        z >= planet.range.start.z && z <= planet.range.end.z)
    )?.class;
}
