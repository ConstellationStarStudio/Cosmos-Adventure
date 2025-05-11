import * as mc from "@minecraft/server";
import machines from "../core/machines/AllMachineBlocks";


export function get_data(machine) {
	return machines[machine.typeId.replace('cosmos:', '')]
}

export function load_dynamic_object(storage, name) {
	return JSON.parse(storage.getDynamicProperty(name) ?? "{}")
}

export function save_dynamic_object(storage, name, value) {
	storage.setDynamicProperty(name, JSON.stringify(value)) 
}

export function str(object) { return JSON.stringify(object) }

/**@param {mc.Block[]} locations @param {mc.Dimension} dim */
export const destroyBlocksJOB = function* (locations, dim) {
	for (const loc of locations) {
		dim.runCommand(`setblock ${loc.x} ${loc.y} ${loc.z} air [] destroy`);
		yield;
	}
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
export function get_vars(item, index, def = 0) {
	return item ? + item.getLore()[index] : def
}

export function get_lore(container, data, name, def = 0) {
	const lore_item = container.getItem(data.lore.slot)
	return lore_item ? + lore_item?.getLore()?.[data.lore[name]] : def
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
	return a.x == b.x && a.y == b.y && a.z == b.z;
}
export function floor_position({ x, y, z }) {
	return { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
}