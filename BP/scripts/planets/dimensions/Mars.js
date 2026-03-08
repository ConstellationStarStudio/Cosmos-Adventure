import { world, system } from "@minecraft/server";
import { Planet } from "../../planets/GalacticraftPlanets";
import { saved_rocket_items, rocket_nametags, dismount } from "../../api/player/liftoff";
import { set_items_to_vehicle } from "../../core/vehicles/Vehicle";
import { save_dynamic_object } from "../../api/utils";

export class Mars extends Planet{
    constructor(){
        super();
        this._type = "mars";
        this._range = { start: { x: -100000, z: 50000 }, end: { x: -50000, z: 100000 } };
        this._gravity =  3.7;
        this._center = {x: -75000, z: 75000};
        this._time = {length: 24000, day: 12000};
        this._fuelMultiplier = 0.9;
    }
    launching(player, data, loaded = false){
        player.runCommand("fog @s push cosmos:mars_fog mars")
        if(loaded){ landing_balloons_motion(player, data); return;}
        let loc = { x: this._center.x + (Math.random() * 20), y: 1000, z: this._center.z + (Math.random() * 20) };
        if(data.items) saved_rocket_items.set(data.id, data.items);
        
        player.setDynamicProperty('dimension', JSON.stringify(data));
        if(player.dimension.id == "minecraft:the_end"){
            player.teleport({x: 0, y: 500, z: 0}, {dimension: world.getDimension("overworld")})
            return;
        }
        player.teleport(loc, { dimension: world.getDimension("the_end")})
    }
}

function get_motion_after_ground_hit(motion, hits){
    let mag = (1 / hits) * 4;
    motion.x = Math.random() - 0.5;
    motion.y = 1;
    motion.z = Math.random() - 0.5;
    
    motion.x *= mag / 3;
    motion.y *= mag;
    motion.z *= mag / 3;
    return motion;
}
function landing_balloons_motion(player, data, load = true){
    let ground_hits = 0;
    let ground_tick = 0;
    let rotation_pitch_speed = Math.random();
    let rotation_yaw_speed = Math.random();

    let rotation_pitch = 0;
    let rotation_yaw = 0;

    let motion = {x: 0, y: 0, z: 0};

    player.inputPermissions.setPermissionCategory(2, false);
    player.inputPermissions.setPermissionCategory(6, false);
    let items_to_set = saved_rocket_items.get(data.id);
    saved_rocket_items.delete(data.id)
    let size = data.size - 2
    let group = 'cosmos:inv' + size;
    let landing_balloons = player.dimension.spawnEntity("cosmos:landing_balloons", {x: player.location.x, y: 250, z: player.location.z});
    landing_balloons.triggerEvent("cosmos:lander_gravity_disable");
    player.teleport({x: player.location.x, y: 1000, z: player.location.z});
    landing_balloons.teleport({x: player.location.x, y: 1000, z: player.location.z});
    landing_balloons.getComponent("minecraft:rideable").addRider(player);
    player.camera.setCamera("minecraft:follow_orbit", { radius: 20 });

    
    player.removeTag("ableToOxygen")

    let is_load = load;
    let camera = player.getRotation();
    let t = 0;
    let landing_balloons_flight = system.runInterval(() => {
        if(is_load){
            let new_camera = player.getRotation();
            if(new_camera.x != camera.x || new_camera.y != camera.y) is_load = false
            landing_balloons.triggerEvent(group);
            landing_balloons.nameTag = '§f§u§e§l§_§c§h§e§s§t§' + rocket_nametags[size]
            return;
        }
        if(!player || !player.isValid){
            system.clearRun(landing_balloons_flight);
            return;
        }
        if(!landing_balloons || !landing_balloons.isValid){
            dismount(player);
            system.clearRun(landing_balloons_flight);
            return;
        }
        t++;
        if(t < 40) return;
        rotation_pitch += rotation_pitch_speed;
        rotation_yaw += rotation_yaw_speed;

        rotation_pitch = (rotation_pitch > 20) ? 20 : (rotation_pitch < -20)? -20: rotation_pitch;
        rotation_yaw = (rotation_yaw > 360)? 0: (rotation_yaw < 0)? 360: rotation_yaw;

        if(ground_hits === 0 && ground_tick === 0) motion.y = -landing_balloons.location.y / 50;
        else if(ground_hits < 14 && ground_tick === 0){
            motion.y *= 0.95;
            motion.y -= 0.08;
        }
        if(landing_balloons.location.y < 500 && landing_balloons.getVelocity().y == 0){
            ground_tick++;
        }
        if(ground_tick == 2){
            ground_tick = 0;
            ground_hits++;
            if(ground_hits >= 14){
                player.inputPermissions.setPermissionCategory(2, true);
                landing_balloons.clearVelocity();
                player.addTag("ableToOxygen");
                player.addTag("in_space");
                dismount(player);
                landing_balloons.getComponent("minecraft:rideable").ejectRider(player)
                landing_balloons.triggerEvent("cosmos:rideable_false")
                save_dynamic_object(landing_balloons, {fuel: data.fuel}, "vehicle_data")
                set_items_to_vehicle(landing_balloons, size, items_to_set, data.typeId)
                
                landing_balloons.triggerEvent("cosmos:lander_gravity_enable")
                system.clearRun(landing_balloons_flight);
                return;
            }
            else{
                motion = get_motion_after_ground_hit(motion, ground_hits);
            }
        }
        landing_balloons.setProperty("cosmos:rotation_x", rotation_pitch);
        landing_balloons.setProperty("cosmos:rotation_y", rotation_yaw);
        landing_balloons.clearVelocity();
        landing_balloons.applyImpulse({x: motion.x, y: motion.y, z: motion.z});

    });
}