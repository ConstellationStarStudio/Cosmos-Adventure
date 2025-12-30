import { world, system } from "@minecraft/server";
import { coords_loop, Planet } from "../planets/dimension/GalacticraftPlanets.js";
import { player_gravity } from '../planets/dimension/gravity.js';
import { spawn_footprint } from "../planets/events/footprint.js";
import { throw_meteors } from "../planets/events/meteor_event.js";
import { dungeon_finder_loop } from "./items/dungeon_finder.js";
import { oxygen_spending, is_entity_in_a_bubble } from "../api/player/oxygen.js";

function space_tags_removing(player){
    player.removeTag("oxygen_hunger")
    player.removeTag("in_space")
    player.removeTag("ableToOxygen")
}
//the main player cycle
world.afterEvents.worldLoad.subscribe(() => {
    system.runInterval(() => {
        let players = world.getAllPlayers();
        let currentTick = system.currentTick;
        let coords_enabled = world.gameRules.showCoordinates;

        players.forEach((player) => {
            let tags = player.getTags();
            //manage oxygen
            if(!(currentTick % 20) && tags.includes("ableToOxygen") && !tags.includes("oxygen_hunger") && player.getGameMode() == "Survival" && !is_entity_in_a_bubble(player)) oxygen_spending(player)
            //manage asteroids falling in the moon
            if(tags.includes("in_space")) throw_meteors(player)
            //manage dungeon finder
            dungeon_finder_loop(player)
            //manage coordinates
            if(coords_enabled) coords_loop(player)
            //manage footprints in the moon
            if(!(currentTick % 10) && tags.includes("in_space")) spawn_footprint(player, player.location)
        });
        //manage gravity
        //player_gravity(players_in_space)
    });
});

//space player tags removing 
world.afterEvents.playerSpawn.subscribe((data) => {
    if(data.player.dimension.id !== "minecraft:the_end") space_tags_removing(data.player)
    data.player.removeTag("oxygen_hunger");
    data.player.setDynamicProperty("in_celestial_selector")
});

world.afterEvents.playerDimensionChange.subscribe((data) => {
    if(data.toDimension.id == "minecraft:the_end"){
        let planet = Planet.getAll().find(pl => pl.isOnPlanet(data.toLocation));
        if(!planet) return;
        data.player.addTag("in_space");
        data.player.addTag("ableToOxygen");
    }
    if(data.fromDimension.id == "minecraft:the_end") space_tags_removing(data.player)
});
