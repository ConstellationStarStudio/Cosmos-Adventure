import {MolangVariableMap} from "@minecraft/server";

export function spawn_footprint(player, location){
    let velocity = player.getVelocity();
    if(player.isSneaking || Math.abs(velocity.x) + Math.abs(velocity.z) < 0.1 || player.getBlockStandingOn()?.typeId !== "cosmos:moon_turf") return;
    let {x, y, z} = location;
    let variable_map = new MolangVariableMap();
    let rotation = player.getRotation().y;
    rotation = (rotation < 0)? rotation + 360: rotation;
    rotation = 360 - rotation;
    variable_map.setFloat("variable.rot", rotation);
    y = player.dimension.getTopmostBlock({x: x, z: z}).location.y + 1.01;
    player.dimension.spawnParticle("cosmos:footprint", {x: x, y: y, z: z}, variable_map)
}