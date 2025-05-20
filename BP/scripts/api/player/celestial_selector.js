import { ActionFormData } from "@minecraft/server-ui";
import { world, system, Player } from "@minecraft/server";
import { moon_lander } from "./liftoff";

const debug = true

function read_inventory(player) {
	if (player.getGameMode() == "creative") return { aluminum: true, wafer: true, tin: true, iron: true }
	let aluminum = 0, wafer = 0, tin = 0, iron = 0;
	const inventory = player.getComponent("inventory").container
	for (let slot = 0; slot < inventory.size; slot++) {
		const item = inventory.getItem(slot)
		if (!item) continue;
		switch (item.typeId) {
			case 'cosmos:aluminum_ingot': aluminum += item.amount; break;
			case 'cosmos:advanced_wafer': wafer += item.amount; break;
			case 'cosmos:tin_ingot': tin += item.amount; break;
			case 'minecraft:iron_ingot': iron += item.amount; break;
		}
	}
	return {
		aluminum: aluminum >= 16,
		wafer: wafer >= 1,
		tin: tin >= 32,
		iron: iron >= 24,
	}
}

export function select_solar_system(player, tier = 1) {
	const space_stations = JSON.parse(world.getDynamicProperty("all_space_stations") ?? '{}')
	const has_station = player.nameTag in space_stations
	let form = new ActionFormData()
		.title("Celestial Panel Solar System")
		.body(`Tier ${tier} Station ${has_station || ('false ' + JSON.stringify(read_inventory(player)))}`)
		.button(`Launch to Venus`)
		.button(`Launch to Overworld`)
		.button(`Launch to Mars`)
		.button(`Launch to Asteroids`)
		.button(`Launch to Moon`)
		.button(`Create Space Station`)
	for (let player_name of Object.keys(space_stations)) {
		const name = space_stations[player_name].name
		form.button(`Launch to ${name}`)
		form.button(`Rename ${name}`)
	}
	form.show(player).then((response) => {
		if (response.canceled) {
			if (!debug) select_solar_system(player); return
		}
		switch (response.selection) {
			case 0: if (tier >= 3) launch(player, "Venus"); return
			case 1: launch(player, "Overworld"); return
			case 2: if (tier >= 2) launch(player, "Mars"); return
			case 3: if (tier >= 3) launch(player, "Asteroids"); return
			case 4: launch(player, "Moon"); return
			case 5: if (!Object.values(read_inventory(player)).includes(false)) create_station(player); return
		}
		const station_index = response.selection - 6
		const station = Object.values(space_stations)[Math.floor(station_index / 2)]
		if (station_index % 2 == 0) launch_to_station(player, station)
		if (station_index % 2 == 1) rename_station(player, station)
	})
}
/**@param {Player} player  */
function launch(player, planet) {
	player.setDynamicProperty("in_celestial_selector")
	if (planet == 'Moon' && player.getComponent("minecraft:riding")) {
		let rocket = player.getComponent("minecraft:riding").entityRidingOn;
		let fuel = rocket.getDynamicProperty("fuel_level");
		rocket.remove();
		let moon = world.getDimension("the_end");
		let dimension = player.dimension;
		let loc = { x: 75000 + (Math.random() * 20), y: 1000, z: 75000 + (Math.random() * 20) };
		player.setDynamicProperty('dimension', JSON.stringify([planet, fuel, loc]))
		player.teleport(loc, { dimension: moon });
		if (dimension.id == "minecraft:the_end"){
			system.runTimeout(() => {moon_lander(player, false);}, 5);
		}
	}
	if (debug) player.sendMessage(`Launch ${player.nameTag} to ${planet}`)
}

function launch_to_station(player, station) {
	player.setDynamicProperty("in_celestial_selector")
	if (debug) player.sendMessage(`Launch ${player.nameTag} to ${station.name}`)
}

function rename_station(player, station) {
	if (debug) player.sendMessage(`Rename ${station.name}`)
}

function create_station(player) {
	if (debug) player.sendMessage(`Create Space Station`)
	const space_stations = JSON.parse(world.getDynamicProperty("all_space_stations") ?? '{}')
	space_stations[player.nameTag] = { name: `${player.nameTag}'s Space Station` }
	space_stations['Zahar'] = { name: `NSS` }
	world.setDynamicProperty("all_space_stations", JSON.stringify(space_stations))
}

export function start_celestial_selector(player) {
	player.setDynamicProperty('in_celestial_selector', true)
	player.runCommand('hud @s hide all')
	const fade = system.runInterval(() => {
		if (player.getDynamicProperty('in_celestial_selector')) {
			player.camera.fade({ fadeTime: { fadeInTime: 0, fadeOutTime: 0.5, holdTime: 2 } })
		} else {
			player.runCommand('hud @s reset')
			system.clearRun(fade)
		}
	}, 20)
	select_solar_system(player)
}