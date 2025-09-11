import { world, system } from "@minecraft/server"

function dot(u, v) {
	return u.x * v.x + u.y * v.y + u.z * v.z
}
function cross(u, v) {
	return {
		x: u.y * v.z - u.z * v.y,
		y: u.z * v.x - u.x * v.z,
		z: u.x * v.y - u.y * v.x
	}
}
function normalize(vector) {
	const length = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2)
	return {
		x: vector.x / length,
		y: vector.y / length,
		z: vector.z / length,
	}
}
function get_direction(target, player) {
	const view = player.getViewDirection()
	const origin = player.location
	if ((target.planet ?? "minecraft:overworld") == player.dimension.id) {
		const norm_view = normalize({x: view.x, y: 0, z: view.z})
		const norm_distance = normalize({x: target.x - origin.x, y: 0, z: target.z - origin.z})
		const cos = dot(norm_view, norm_distance)
		const sin = dot(cross(norm_distance, norm_view), {x:0, y:1, z:0})
		const angle = Math.atan2(sin, cos)
		return Math.floor(16 * angle / Math.PI + 16) || 0
	} else return system.currentTick % 32
}

export function dungeon_finder_loop(player){
    const mainhand = player.getComponent("equippable").getEquipment("Mainhand")?.typeId
    if (mainhand != "cosmos:dungeon_finder") return
    const location = {x:0, z:0/*, planet: "moon"*/}
    const direction = get_direction(location, player)
	player.setProperty("cosmos:dungeon_finder", direction)
}