import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { world, system, Player } from "@minecraft/server";
import { get_rocket_data } from "./liftoff";
import { launch_to_earth } from "../../planets/dimensions/Overworld";
import { saved_rocket_items } from "./liftoff";

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
		.body(`Tier ${tier} Station ${has_station ? 'true Player:' + player.nameTag : 'false ' + JSON.stringify(read_inventory(player))}`)
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
			case 5: {
				if (!Object.values(read_inventory(player)).includes(false)) {
					create_station(player);
					select_solar_system(player, tier, calledViaCommand);
				}
				return
			}
		}
		const station_index = response.selection - 6
		const station = Object.values(space_stations)[Math.floor(station_index / 2)]
		if (station_index % 2 == 0) launch_to_station(player, station, space_stations, calledViaCommand)
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
	if(rocket_data.items) saved_rocket_items.set(rocket_data.id, rocket_data.items);
	if(rocket) rocket.remove();

	let planet_object = world.getPlanet(planet);
	rocket_data.type = (planet == 'overworld')? planet: planet_object?.type; 
	if(planet_object) planet_object.launching(player, rocket_data, false);
    else if(planet == 'overworld') launch_to_earth(player, rocket_data)

	if (debug) player.sendMessage(`Launch ${player.nameTag} to ${planet}`)
}

function launch_to_station(player, station, station_object, calledViaCommand) {
	player.setDynamicProperty("in_celestial_selector")

	let riding = !calledViaCommand ? player.getComponent("minecraft:riding"): undefined;
	if(!calledViaCommand && !riding) return;

	let rocket = riding?.entityRidingOn; 
	let rocket_data = get_rocket_data(rocket, calledViaCommand);
	if(rocket_data.items) saved_rocket_items.set(rocket_data.id, rocket_data.items);
	if(rocket) rocket.remove();
	
	rocket_data.station = {location: station.location, is_generated: station.is_generated, type: "stations"};
	rocket_data.type = "stations";

	let planet_object = world.getPlanet("stations");
	planet_object.launching(player, rocket_data, false);
	station.is_generated = true;

	world.setDynamicProperty("all_space_stations", JSON.stringify(station_object));
	if (debug) player.sendMessage(`Launch ${player.nameTag} to ${station.name}`)
}

function rename_station(player, station) {
	const space_stations = JSON.parse(world.getDynamicProperty("all_space_stations") ?? '{}')
	const owner = Object.keys(space_stations).find(key => space_stations[key].location.x === station.location.x)
	if (!owner) return
	
	if (owner !== player.nameTag) {
		player.sendMessage("§cYou can only rename your own space station!");
		return
	}

	const modal = new ModalFormData()
		.title("Rename Space Station")
		.textField("Enter new name:", "My Space Station", station.name);

	modal.show(player).then((response) => {
		if (response.canceled || !response.formValues || !response.formValues[0]) {
			select_solar_system(player);
			return;
		}

		const newName = response.formValues[0].trim();
		if (newName === "") {
			select_solar_system(player);
			return;
		}

		const updated_stations = JSON.parse(world.getDynamicProperty("all_space_stations") ?? '{}')
		if (updated_stations[owner]) {
			updated_stations[owner].name = newName;
			world.setDynamicProperty("all_space_stations", JSON.stringify(updated_stations));
			player.sendMessage(`§aSpace station successfully renamed to: ${newName}`);
		}
		select_solar_system(player);
	})
}

function create_station(player) {
	if (debug) player.sendMessage(`Create Space Station`)
	const space_stations = JSON.parse(world.getDynamicProperty("all_space_stations") ?? '{}')
    let station_location = {x: 0 + Object.keys(space_stations).length * 2000, y: 70, z: 0}
	space_stations[player.nameTag] = { name: `${player.nameTag}'s Space Station`, location: station_location, is_generated: false}
	world.setDynamicProperty("all_space_stations", JSON.stringify(space_stations))
	if (player.getGameMode() !== "Creative") {
		player.runCommand("clear @s cosmos:aluminum_ingot 0 16");
		player.runCommand("clear @s cosmos:advanced_wafer 0 1");
		player.runCommand("clear @s cosmos:tin_ingot 0 32");
		player.runCommand("clear @s minecraft:iron_ingot 0 24");
	}
}

export function start_celestial_selector(player, tier = 1, calledViaCommand = false) {
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
	select_solar_system(player, tier, calledViaCommand)
}