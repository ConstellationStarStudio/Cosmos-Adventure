import {MolangVariableMap} from "@minecraft/server";

export function spawn_footprint(player, location){
    let velocity = player.getVelocity();
    if(player.isSneaking || Math.abs(velocity.x) + Math.abs(velocity.z) < 0.1 || player.getBlockStandingOn()?.typeId !== "cosmos:moon_turf") return;
    let {x, y, z} = location;
    let variable_map = new MolangVariableMap();
    variable_map.setFloat("variable.rot", player.getRotation().y + 180)
    x =  x + (velocity.x * 11);  z + (velocity.z * 11); y = player.dimension.getTopmostBlock({x: x, z: z}).location.y + 1.01;
    player.dimension.spawnParticle("cosmos:footprint", {x: x, y: y, z: z}, variable_map)
}