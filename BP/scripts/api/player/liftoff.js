import { world, system } from "@minecraft/server";
import { save_dynamic_object, load_dynamic_object } from "../utils";

export const rocket_nametags = {0: 0, 18: 1, 36: 2, 54: 3}
export let saved_rocket_items = new Map();

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
        let {x, y, z} = rocket.location;
        let render_distanse = world.getDynamicProperty("render_distance") ?? 5;
        if(rocket.dimension.id == "minecraft:overworld" && y > render_distanse * 16){
            let scale = y - 200/1000;
            scale = 850 * (0.25 - scale / 10000);
            scale = Math.max(scale, 0.2);
            scale = scale/200;
            rocket.setProperty("cosmos:planet", true);
            rocket.setProperty("cosmos:planet_scale", scale)
        }
    })
}

world.afterEvents.entityRemove.subscribe(({removedEntityId}) => {
    world.getPlayers().filter(player => player.getDynamicProperty('in_the_rocket') == removedEntityId)
    .forEach(player => dismount(player))
})