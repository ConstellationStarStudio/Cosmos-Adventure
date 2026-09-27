import { world, system } from "@minecraft/server";
import { coords_loop } from "../planets/GalacticraftPlanets.js";
import { getPlanetByLocation } from "../api/utils.js";
import { spawn_footprint } from "../planets/events/footprint.js";
import { throw_meteors } from "../planets/events/meteor_event.js";
import { dungeon_finder_loop } from "./items/dungeon_finder.js";
import { oxygen_spending, is_entity_in_a_bubble } from "../api/player/oxygen.js";
import { launch_to_earth } from "../planets/dimensions/Overworld.js";
import { player_gravity } from "../planets/gravity.js";

function space_tags_removing(player){
    player.removeTag("oxygen_hunger");
    player.removeTag("in_space");
    player.removeTag("ableToOxygen");
}
//the main player cycle
world.afterEvents.worldLoad.subscribe(() => {
    system.runInterval(() => {
        let players = world.getAllPlayers();
        let currentTick = system.currentTick;
        let coords_enabled = world.gameRules.showCoordinates;

        players.forEach((player) => {
            let tags = player.getTags();
            let planet = player.getPlanet();
            //manage oxygen
            if(!(currentTick % 20) && tags.includes("ableToOxygen") && !tags.includes("oxygen_hunger") && player.getGameMode() == "Survival" && !is_entity_in_a_bubble(player)) oxygen_spending(player)
            //manage asteroids falling in the moon
            if(tags.includes("in_space") && planet?.type == "moon"){
                throw_meteors(player);
            }
            //manage dungeon finder
            dungeon_finder_loop(player)
            //manage coordinates
            if(coords_enabled) coords_loop(player)
            //manage footprints in the moon
            if(!(currentTick % 10) && tags.includes("in_space") && !player.getComponent("minecraft:riding")) spawn_footprint(player, player.location)

            if(!(currentTick % 10) && planet?.type == "stations" && player.location.y < 10) launch_to_earth(player, {type: "overworld"}, false)
        });
        //manage gravity
        player_gravity();
    });
});

const SPACE_DIMENSIONS = ["cosmos:moon", "cosmos:mars", "cosmos:venus", "cosmos:asteroids", "cosmos:space_stations"];

//removes space tags and sets standart permissions to default
world.afterEvents.playerSpawn.subscribe(({player}) => {
    if(!SPACE_DIMENSIONS.includes(player.dimension.id)){
        space_tags_removing(player)
    }
    player.removeTag("gravity_falling")
    player.removeTag("oxygen_hunger");
    player.setDynamicProperty("in_celestial_selector");

    player.inputPermissions.setPermissionCategory(6, true);
    player.inputPermissions.setPermissionCategory(7, true);
    player.inputPermissions.setPermissionCategory(8, true);
});

world.afterEvents.playerDimensionChange.subscribe((data) => {
    if(SPACE_DIMENSIONS.includes(data.toDimension.id)){
        let planet = data.player.getPlanet() || getPlanetByLocation(data.toLocation, data.toDimension);
        if(!planet) return;
        data.player.addTag("in_space");
        data.player.addTag("ableToOxygen");
    }
    if(SPACE_DIMENSIONS.includes(data.fromDimension.id)){
        try {
            data.player.runCommand("fog @s remove mars");
        } catch (e) {}
        space_tags_removing(data.player);
        data.player.removeTag("gravity_falling")
    }
});
