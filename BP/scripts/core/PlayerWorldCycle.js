import { world, system } from "@minecraft/server";
import { coords_loop, Planet } from "../planets/dimension/GalacticraftPlanets.js";
import { player_gravity } from '../planets/dimension/gravity.js';
import { dungeon_finder_loop } from "./items/dungeon_finder.js";
import { oxygen_spending } from "../api/player/oxygen.js";

function space_tags_removing(player){
    player.removeTag("oxygen_hunger")
    player.removeTag("in_space")
    player.removeTag("ableToOxygen")
}
//the main player cycle
system.runInterval(() => {
    let space = world.getDimension("the_end");
    let players_in_space = space.getPlayers({tags: ["in_space"]});
    //manage oxygen
    if(!(system.currentTick % 20)) oxygen_spending(space.getPlayers({tags: ["ableToOxygen"], excludeTags: ["oxygen_hunger"], excludeGameModes: ["creative", "spectator"]}))
    //manage gravity
    player_gravity(players_in_space)
    //manage dungeon finder
    dungeon_finder_loop(world.getAllPlayers())
    //manage coordinates
    if(world.gameRules.showCoordinates) coords_loop(world.getAllPlayers())
});

//space player tags removing 
world.afterEvents.playerSpawn.subscribe((data) => {
    if(data.player.dimension.id !== "minecraft:the_end") space_tags_removing(data.player)
    data.player.removeTag("oxygen_hunger");
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
