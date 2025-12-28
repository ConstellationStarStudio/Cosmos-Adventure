import {world, BlockPermutation} from "@minecraft/server";

export function throw_meteors(player){
    let chance = 5 * 750 * 1;
    let dim = player.dimension;
    if(Math.floor(Math.random() * chance) === 0 || Math.floor(Math.random() * chance * 3) === 0){
        let closest_player = dim.getPlayers({location: player.location, maxDistance: 100, closest: 5, minDistance: 2})[0]
        closest_player = (!closest_player)? player: closest_player;
        
        let x = Math.floor(Math.random() * 20) + 160;
        let z = Math.floor(Math.random() * 20) - 10;
        let motX = Math.random() * 2 - 2.5;
        let motZ = Math.random() * 5 - 2.5;
        let radius = [1, 0.5, 0.35, 0.25];
        //so it reduces radius if chunks aren't loaded yet
        for(let r of radius){
            if(dim.isChunkLoaded({x: closest_player.location.x + Math.floor(x * r), y: 0, z: closest_player.location.z + z})){
                x = Math.floor(x * r);
                break;
            }else if(r == 0.25) return;
        }
        let meteor = closest_player.dimension.spawnEntity("cosmos:fallen_meteor", {x: closest_player.location.x + x, y: 255, z: closest_player.location.z + z})
        meteor.teleport({x: meteor.location.x, y: 355, z: meteor.location.z})
        meteor.applyImpulse({x: motX, y: 0, z: motZ})
    }
}

world.afterEvents.entityDie.subscribe(({deadEntity}) => {
    if(deadEntity.typeId == "cosmos:fallen_meteor" && (deadEntity.location.y <= 255 && deadEntity.location.y > -64)){
        deadEntity.dimension.createExplosion(deadEntity.location, 0.2)
        deadEntity.dimension.getBlock(deadEntity.location).setPermutation(
            BlockPermutation.resolve("cosmos:fallen_meteor", {"cosmos:heat_level": 1}));
        deadEntity.remove();
    }
});