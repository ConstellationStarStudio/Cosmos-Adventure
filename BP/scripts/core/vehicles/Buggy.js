import { system } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils";

export default function(entity){
    let buggy = entity;
    let rider = buggy.getComponent("minecraft:rideable")?.getRiders()[0];
    let variables = load_dynamic_object(buggy, "vehicle_data");

    if(!rider){
        variables.speed = 0;
        save_dynamic_object(buggy, variables, "vehicle_data")
        return;
    }
    let inventory = buggy.getComponent('minecraft:inventory');
    let container = inventory.container;

    let time_climbing = variables?.time_climbing ?? 0;
    let fuel = variables?.fuel ?? 0;
    let speed = variables?.speed ?? 0;

    const velocity = buggy.getVelocity();

    let info = rotate_buggy(speed, buggy.getProperty("cosmos:rotation_y"), {x: buggy.getProperty("cosmos:wheel_rotation_x"), 
    y: buggy.getProperty("cosmos:wheel_rotation_y")}, rider.inputInfo.getMovementVector());
    speed = info.speed;

    let motion = {x: 0, y: 0, z: 0};
    
    const direction = {x: Math.cos((info.rotation + 90) / 57.2957795147), z: Math.sin((info.rotation + 90) / 57.2957795147)};
    if(fuel > 0){
        motion.x = -(speed * direction.x); 
        motion.z = -(speed * direction.z);
        const sqrt_motion = motion.x * motion.x + motion.z * motion.z;
        if(Math.abs(motion.x * motion.z) > 0.0001 && sqrt_motion !== 0 && !(system.currentTick % (Math.floor(4 / sqrt_motion) + 1))) fuel = Math.max(0, fuel - 1);
    }

    info.wheel_rotation.x += Math.sqrt(motion.x * motion.x + motion.z * motion.z) * 150 * (speed < 0 ? -1 : 1);
    if(info.wheel_rotation.x > 360) info.wheel_rotation.x = info.wheel_rotation.x % 360;
    else if(info.wheel_rotation.x < 0) info.wheel_rotation.x = 360 - (Math.abs(info.wheel_rotation.x) % 360);

    if(info.should_climb){
        const block = buggy.dimension.getBlockFromRay(buggy.location, {x: -direction.x, y: 0, z: -direction.z}, {maxDistance: 2.5})?.block;
        if(block && !block.isAir && block.typeId !== "cosmos:buggy_fueling_pad"){
            speed *= 0.9;
            motion.y = 0.15 * ((-Math.pow((time_climbing) - 1, 2)) / 250.0) + 0.15;
            motion.y = Math.max(-0.15, motion.y);
        }
    }
    if(((motion.x > 0.001 || motion.x < 0.001) || (motion.z > 0.001 || motion.z < 0.001)) && !buggy.isOnGround) time_climbing += 1;
    else time_climbing = 0;

    buggy.setProperty("cosmos:wheel_rotation_x", info.wheel_rotation.x);
    buggy.setProperty("cosmos:wheel_rotation_y", info.wheel_rotation.y);
    buggy.setProperty("cosmos:rotation_y", info.rotation);

    motion.x -= velocity.x;
    motion.z -= velocity.z;
    if(motion.y >= 0) buggy.applyImpulse(motion);

    if(system.currentTick % 10 === 0){
            container.add_ui_display(inventory.inventorySize - 2, 'Fuel Tank. Requires\nfuel loader to fill', Math.ceil((Math.ceil(fuel/26))))
            container.add_ui_display(inventory.inventorySize - 1, "§2" + `${Math.round(fuel * 100/1000)}` + '.0%% full')
    }
    save_dynamic_object(buggy, {speed, time_climbing, fuel}, "vehicle_data");  
}

function rotate_buggy(speed, rotation, wheel_rotation, input){
    speed += input.y * 0.4/20;
    rotation -= input.x * 3.5;
    if(rotation > 360) rotation = 0;
    else if(rotation < 0) rotation = 360;
    if(input.x > 0) wheel_rotation.y = Math.max(-30, Math.min(30, wheel_rotation.y + 0.5));
    else if(input.x < 0) wheel_rotation.y = Math.max(-30, Math.min(30, wheel_rotation.y - 0.5));
    wheel_rotation.y = Math.max(-30, Math.min(30, wheel_rotation.y * 0.9));

    speed *= 0.98;
    if(speed > 0.8) speed = 0.8;
    const should_climb = (speed > 0.001 || speed < 0.001)? true: false;
    return {rotation, speed, wheel_rotation, should_climb}
}