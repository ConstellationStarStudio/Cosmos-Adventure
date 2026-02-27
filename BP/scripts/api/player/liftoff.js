import { world, system, ItemStack, BlockPermutation } from "@minecraft/server";
import { moon_lander } from "../../core/vehicles/landers/MoonLander";
import { place_parachest } from "../../core/machines/blocks/Parachest";
import { save_dynamic_object, load_dynamic_object } from "../utils";

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
export const rocket_nametags = {0: 0, 18: 1, 36: 2, 54: 3}
export let saved_rocket_items = new Map();


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
                    set_items_to_lander(parachest_block, player_data.size - 2, saved_rocket_items.get(player_data.id), player_data.typeId);
                    saved_rocket_items.delete(player_data.id);
                }, 5);
            }, 10);
            system.clearRun(player_falling);
        }
    });
}
export function set_items_to_lander(lander, size, items_to_set, typeId){
    let container = lander.getComponent("minecraft:inventory").container;
    let inventorySize = lander.getComponent("minecraft:inventory").inventorySize;
    
    //checks items_to_set array existence
    if(items_to_set){
        for(let i = 0; i <= (inventorySize - 5); i++){
            container.setItem(i, items_to_set[i])
        }
    }
    //put rocket and launchpad into inventory
    container.setItem(inventorySize - 2, new ItemStack("cosmos:rocket_launch_pad", 9))
    
    let rocket_item = new ItemStack(typeId + "_item")
    rocket_item.setLore([`§r§7Storage Space: ${size}`])
    rocket_item.setDynamicProperty("inventory_size", size)
    container.setItem(inventorySize - 1, rocket_item)
}

world.afterEvents.playerDimensionChange.subscribe((data) => {
    if(!data.player.getDynamicProperty('dimension')) return;
    let player_data = JSON.parse(data.player.getDynamicProperty('dimension'));
    switch(player_data.planet){
        case 'Moon':
            system.run(() => {moon_lander(data.player);});
            break;
        case 'Overworld':
            system.run(() => {return_to_earth(data.player);});
            break;
    }
});

export function start_countdown(rocket, player) {
    rocket.setDynamicProperty('active', true)
    player.inputPermissions.setPermissionCategory(2, false)
    //player.playSound("rocket.launch") this does'nt works because of camera thing 
    let countdown = player.getGameMode() == 'Creative' ? 20 : 20
    rocket.dimension.spawnParticle("cosmos:rocket_smoke", {x: rocket.location.x, y: rocket.location.y + 1.1, z: rocket.location.z});
    const counter = system.runInterval(()=> {
        if (!rocket || !rocket.isValid) {
            system.clearRun(counter)
        }
        if (countdown - 1) {
            countdown--
            player.onScreenDisplay.setTitle('§c' + countdown, {fadeInDuration: 0, fadeOutDuration: 0, stayDuration: 20})
        } else {
            world.sendMessage('Liftoff!')
            system.clearRun(counter)
            rocket_flight(rocket)
            break_pad(rocket)
        }
    }, 20)
}

export function break_pad(rocket) {
    if (!rocket || !rocket.isValid) return
    const {location:{x,y,z}, dimension} = rocket
    world.gameRules.doTileDrops = false
    dimension.runCommand(`fill ${x-1} ${y} ${z-1} ${x+1} ${y} ${z+1} air destroy`)
    world.gameRules.doTileDrops = true
} 

export function dismount(player) {
    player.setProperty("cosmos:is_sitting", 0);
    player.setProperty("cosmos:rotation_x", 90);
    //player.setProperty("cosmos:rotation_y", 180);
    player.setDynamicProperty('in_the_rocket')
    player.onScreenDisplay.setTitle('')
    player.camera.clear()
    player.inputPermissions.setPermissionCategory(2, true)
    player.inputPermissions.setPermissionCategory(6, true)
}
export function rocket_rotation(player, rocket){
   let input_x = player.inputInfo.getMovementVector().x;
   let input_y = player.inputInfo.getMovementVector().y;
   input_x = Math.round(input_x);
   input_y = Math.round(input_y);

   let rotation = {x: rocket.getProperty("cosmos:rotation_x"), y: rocket.getProperty("cosmos:rotation_y")};
   rotation.x = Math.min(Math.max(rotation.x + -(input_y * 0.7), -90), 90);
   rotation.y = rotation.y + -(input_x * 1);

    rotation.y = (rotation.y > 360)? 0: (rotation.y < 0)? 360:
    rotation.y;
    return rotation;
}
export function rocket_motion(time_since_launch, rotation){
    let multiplier = time_since_launch / 150;
    multiplier = Math.min(multiplier, 1);
    let velocity = {x: 0, y: 0, z: 0};
    velocity.y = -multiplier * Math.cos((rotation.x - 180) / 57.2957795147);

    velocity.x = -(50 * Math.cos(rotation.y/57.2957795147) * Math.sin(rotation.x * 0.01/57.2957795147));
    velocity.z = -(50 * Math.sin(rotation.y/57.2957795147) * Math.sin(rotation.x * 0.01/57.2957795147));
    return velocity;
}
export function rocket_flight(rocket) {
    if (!rocket || !rocket.isValid) return
    let t = 0;
    //enables flight particles
    rocket.setProperty("cosmos:launched", true)
    let flight = system.runInterval(() => {
        if(!rocket || !rocket.isValid || rocket.getComponent("minecraft:rideable").getRiders().length === 0 || rocket.getDynamicProperty("freezed")){
            system.clearRun(flight);
            return;
        }
        let player = rocket?.getComponent("minecraft:rideable").getRiders()[0];
        if(player.getDynamicProperty("in_celestial_selector")) return;
        t++;
        if (t == 40) world.sendMessage('§7Do not save & quit or disconnect while flying the rocket or in the celestial selector.')
        if (!rocket || !rocket.isValid) return
        if (t > 40) rocket.setDynamicProperty('rocket_launched', true)
        
        let rotation = rocket_rotation(player, rocket);
        let velocity = rocket_motion(t, rotation);
        rocket.clearVelocity();
        rocket.applyImpulse({x: velocity.x, y: velocity.y, z: velocity.z});

        let dynamic_object = load_dynamic_object(rocket, "vehicle_data")
        let fuel = dynamic_object?.fuel || 0;
        if(!(system.currentTick % 2)){
            fuel = Math.max(0, fuel - 1)
            dynamic_object.fuel = fuel;
            save_dynamic_object(rocket, dynamic_object, "vehicle_data");
        };
        if(!fuel && player.getGameMode() != "Creative"){
            rocket.setProperty("cosmos:launched", false);
            system.clearRun(flight);
            return;
        }
        rocket.setProperty("cosmos:rotation_y", rotation.y);
        rocket.setProperty("cosmos:rotation_x", rotation.x);
    })
}

world.afterEvents.entityRemove.subscribe(({removedEntityId}) => {
    world.getPlayers().filter(player => player.getDynamicProperty('in_the_rocket') == removedEntityId)
    .forEach(player => dismount(player))
})