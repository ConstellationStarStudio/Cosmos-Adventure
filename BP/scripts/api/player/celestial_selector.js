import { ActionFormData } from "@minecraft/server-ui";
import { world, system, Player } from "@minecraft/server";
import { get_rocket_data } from "./liftoff";
import { launch_to_earth } from "../../planets/dimensions/Overworld";

const debug = true

function read_inventory(player) {
	if (player.getGameMode() == "Creative") return { aluminum: true, wafer: true, tin: true, iron: true }
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

export function select_solar_system(player, tier = 1, calledViaCommand = false) {
	const space_stations = JSON.parse(world.getDynamicProperty("all_space_stations") ?? '{}')
	const has_station = player.nameTag in space_stations
	let form = new ActionFormData()
		.title("Celestial Panel Solar System")
		.body(`Tier ${tier} Station ${has_station || ('false ' + JSON.stringify(read_inventory(player)))}`)
		.button(`Launch to Overworld`)
		.button(`Launch to Moon`)
		.button(`Launch to Mars`)
		.button(`Launch to Venus`)
		.button(`Launch to Asteroids`)
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
			case 0: launch(player, "Overworld", calledViaCommand); return
			case 1: launch(player, "Moon", calledViaCommand); return
			case 2: if (tier >= 2) launch(player, "Mars", calledViaCommand); return
			case 3: if (tier >= 3) launch(player, "Venus", calledViaCommand); return
			case 4: if (tier >= 3) launch(player, "Asteroids", calledViaCommand); return
			case 5: if (!Object.values(read_inventory(player)).includes(false)) create_station(player); return
		}
		const station_index = response.selection - 6
		const station = Object.values(space_stations)[Math.floor(station_index / 2)]
		if (station_index % 2 == 0) launch_to_station(player, station)
		if (station_index % 2 == 1) rename_station(player, station)
	})
}

function launch(player, planet, calledViaCommand) {
	player.sendMessage("Launch to "+ planet)
	player.setDynamicProperty("in_celestial_selector")
	planet = planet.toLowerCase();

    let riding = !calledViaCommand ? player.getComponent("minecraft:riding"): undefined;
	if(!calledViaCommand && !riding) return;
	
	let rocket = riding?.entityRidingOn; 
	let rocket_data = get_rocket_data(rocket, calledViaCommand);
	if(rocket) rocket.remove();

	let planet_object = world.getPlanet(planet);
	rocket_data.type = (planet == 'overworld')? planet: planet_object?.type; 
	if(planet_object) planet_object.launching(player, rocket_data, false);
    else if(planet == 'overworld') launch_to_earth(player, rocket_data)

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

export function start_celestial_selector(player, tier = 1) {
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
	select_solar_system(player, tier)
}

system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
	customCommandRegistry.registerCommand({name: "cosmos:celestialselector", cheatsRequired: true, description: "Opens the Celestial Selector.", permissionLevel: 1}, 
	(CustomCommandOrigin) => {
		if(CustomCommandOrigin.sourceType == "Entity" && CustomCommandOrigin.sourceEntity.typeId == "minecraft:player"){
			system.run(() => {select_solar_system(CustomCommandOrigin.sourceEntity, 3, true)});
		}
	});
});