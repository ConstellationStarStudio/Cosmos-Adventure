import { world, system } from "@minecraft/server";
import { place_parachest } from "../../core/machines/blocks/Parachest";
import { set_items_to_vehicle } from "../../core/vehicles/Vehicle";

const parachutes = {"cosmos:parachute_black": 0, 
    "cosmos:parachute_blue": 1,
    "cosmos:parachute_brown": 2,
    "cosmos:parachute_darkblue": 3, 
    "cosmos:parachute_darkgray": 4,
    "cosmos:parachute_darkgreen": 5,
    "cosmos:parachute_gray": 6,
    "cosmos:parachute_lime": 7,
    "cosmos:parachute_magenta": 8,
    "cosmos:parachute_orange": 9,
    "cosmos:parachute_pink": 10,
    "cosmos:parachute_plain": 11,
    "cosmos:parachute_purple": 12,
    "cosmos:parachute_red": 13,
    "cosmos:parachute_teal": 14,
    "cosmos:parachute_yellow": 15
}

export function return_to_earth(player){
    player.inputPermissions.setPermissionCategory(2, true)
    player.inputPermissions.setPermissionCategory(6, true)
    player.setDynamicProperty('in_the_rocket')

    let overworld = world.getDimension("overworld");
    
    const space_gear = JSON.parse(player.getDynamicProperty("space_gear") ?? '{}')
    let player_data;

    let parachute_color = undefined;
    let parachest = undefined;
    if(space_gear.parachute){
        const [item_id, fill_level] = space_gear.parachute.split(' ');
        parachute_color = parachutes[item_id];
        player.setProperty("cosmos:parachute", parachute_color);
        player.addEffect("slow_falling", 9999, {showParticles: false})
    }
    if(player.getDynamicProperty('dimension')){
        player_data = JSON.parse(player.getDynamicProperty('dimension'));
        player.teleport(player_data.loc, { dimension: world.getDimension("overworld")});
        player.setDynamicProperty('dimension') 

        parachest = overworld.spawnEntity("cosmos:parachute_chest_entity", {x: Math.round(player_data.loc.x) + 5.5, y: 255, z: Math.round(player_data.loc.z) + 5.5})
        parachest.setProperty("cosmos:parachute", parachute_color ?? 11);
        parachest.addEffect("slow_falling", 9999, {showParticles: false, amplifier: 3})
    }
    let player_not_on_ground = true;
    let player_falling = system.runInterval(() => {
        if(player_not_on_ground && player.getVelocity().y >= 0 && player.location.y < 250){
            player.removeEffect("slow_falling");
            player.setProperty("cosmos:parachute", 16);
            player_not_on_ground = false;
            if(!parachest) system.clearRun(player_falling)
        }
        if(parachest && parachest.isValid && ((parachest.getVelocity().y >= 0 && parachest.location.y < 250) || parachest.location.y < -64)){
            system.runTimeout(() => {
                let parachest_loc = parachest.location;
                parachest_loc.y = Math.max(parachest_loc.y, -64)
                let dimension = parachest.dimension;
                parachest.remove();
                let parachest_block = place_parachest(player_data.fuel, dimension, parachest_loc, player_data.size - 2, parachute_color)

                system.runTimeout(() => {
                    set_items_to_vehicle(parachest_block, player_data.size - 2, saved_rocket_items.get(player_data.id), player_data.typeId);
                    saved_rocket_items.delete(player_data.id);
                }, 5);
            }, 10);
            system.clearRun(player_falling);
        }
    });
}