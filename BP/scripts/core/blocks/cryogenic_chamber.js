import { world, system, BlockPermutation, CatmullRomSpline, EasingType } from "@minecraft/server"


export const cryogenic_chamber_component = {
    onPlayerInteract({player, block}){
        let states = block.permutation.getAllStates();
        let {x, y, z} = block.location;
        let pos = [ {x: x, y: y, z: z}, {x: x, y: y - 1, z: z}, {x: x, y: y - 2, z: z}
        ][states["minecraft:multi_block_part"]];

        if(states["cosmos:is_occupied"]) return;

        let time = player.getDynamicProperty("chamber_time");

        if(!time || system.currentTick > time){
            let degree = {north: 270, south: 90, east: 0, west: 180}[states["minecraft:cardinal_direction"]];
            let cam_degree = {north: 90, south: 270, east: 0, west: 180}[states["minecraft:cardinal_direction"]];

            player.inputPermissions.setPermissionCategory(1, false);
            player.inputPermissions.setPermissionCategory(2, false);
            player.teleport({x: pos.x + 0.5, y: pos.y + 0.75, z: pos.z + 0.5}, {rotation: {x: 21, y: degree + 90}});
            play_camera_animation(player, pos, degree, cam_degree);

            block.getParts().forEach((b) => b.setPermutation(b.permutation.withState("cosmos:is_occupied", true)));
            system.runTimeout(() => {
                if(block.typeId == "cosmos:cryogenic_chamber"){
                    block.getParts().forEach((b) => {b.setPermutation(b.permutation.withState("cosmos:is_occupied", false))});
                }
                player.inputPermissions.setPermissionCategory(1, true);
                player.inputPermissions.setPermissionCategory(2, true);
                player.camera.clear();
            }, 72);

            let added_time = 0;
            let planet = player.getPlanet(); 
            if(planet){
                added_time = planet.time.day;
            }else added_time = 12000;

            world.setAbsoluteTime(world.getAbsoluteTime() + added_time);
            player.setDynamicProperty("chamber_time", system.currentTick + 6000);
        }else{
            world.sendMessage({rawtext: [{translate: "message.cryo_chamber.cant_use"},
                {"text": ` ${Math.floor((time - system.currentTick)/20)} `},
                {"translate": "message.seconds"}
            ]});
        }
    },
    onTick({block}){
        if(block.permutation.getState("minecraft:multi_block_part")) return;
        let {x, y, z} = block.location;

        block.dimension.spawnParticle("cosmos:chamber_up", {x: x + 0.3 + Math.random() * 0.4, y: y, z: z + 0.3 + Math.random() * 0.4})
        block.dimension.spawnParticle("cosmos:chamber_up", {x: x + 0.3 + Math.random() * 0.4, y: y, z: z + 0.3 + Math.random() * 0.4})
        
        block.dimension.spawnParticle("cosmos:chamber_down", {x: x + 0.3 + Math.random() * 0.4, y: y + 2.8, z: z + 0.3 + Math.random() * 0.4})
        block.dimension.spawnParticle("cosmos:chamber_down", {x: x + 0.3 + Math.random() * 0.4, y: y + 2.8, z: z + 0.3 + Math.random() * 0.4})
    },
}

function play_camera_animation(player, pos, degree, cam_degree){
    let anim = new CatmullRomSpline();
    anim.controlPoints = [
        { x: pos.x + 0.5 + Math.cos((90 + degree)/57.2957795147) * 5.05, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((90 + degree)/57.2957795147) * 5.05 },
        { x: pos.x + 0.5 + Math.cos((108 + degree)/57.2957795147) * 5, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((108 + degree)/57.2957795147) * 5 },
        { x: pos.x + 0.5 + Math.cos((126 + degree)/57.2957795147) * 5, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((126 + degree)/57.2957795147) * 5 },
        { x: pos.x + 0.5 + Math.cos((144 + degree)/57.2957795147) * 5, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((144 + degree)/57.2957795147) * 5 },
        { x: pos.x + 0.5 + Math.cos((162 + degree)/57.2957795147) * 5, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((162 + degree)/57.2957795147) * 5 },
        { x: pos.x + 0.5 + Math.cos((180 + degree)/57.2957795147) * 5, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((180 + degree)/57.2957795147) * 5 },
        { x: pos.x + 0.5 + Math.cos((198 + degree)/57.2957795147) * 5, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((198 + degree)/57.2957795147) * 5 },
        { x: pos.x + 0.5 + Math.cos((216 + degree)/57.2957795147) * 5, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((216 + degree)/57.2957795147) * 5 },
        { x: pos.x + 0.5 + Math.cos((234 + degree)/57.2957795147) * 5, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((234 + degree)/57.2957795147) * 5 },
        { x: pos.x + 0.5 + Math.cos((252 + degree)/57.2957795147) * 5, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((252 + degree)/57.2957795147) * 5 },
        { x: pos.x + 0.5 + Math.cos((270 + degree)/57.2957795147) * 5.05, y: pos.y + 2, z: pos.z + 0.5 + Math.sin((270 + degree)/57.2957795147) * 5.05 },
    ];

    const progressKeyFrames = [
        { alpha: 0, timeSeconds: 0.0 },
        { alpha: 0.1, timeSeconds: 0.4 },
        { alpha: 0.2, timeSeconds: 0.8 },
        { alpha: 0.3, timeSeconds: 1.2 },
        { alpha: 0.4, timeSeconds: 1.6 },
        { alpha: 0.5, timeSeconds: 2 },
        { alpha: 0.6, timeSeconds: 2.4 },
        { alpha: 0.7, timeSeconds: 2.8 },
        { alpha: 0.8, timeSeconds: 3.2},
        { alpha: 0.9, timeSeconds: 3.6},
        { alpha: 1.0, timeSeconds: 4 },
    ];

    const rotationKeyFrames = [
        { rotation: { x: 0, y: 360 + cam_degree, z: 0 }, timeSeconds: 0.00, easingFunc: EasingType.Linear },
        { rotation: { x: 0, y: 180 + cam_degree, z: 0 }, timeSeconds: 4, easingFunc: EasingType.Linear }
    ];

    player.camera.setCamera("minecraft:free", {location: player.location, rotation: {x: 0, y: 270}});
    player.camera.playAnimation(anim, { totalTimeSeconds: 4.0, animation: { progressKeyFrames: progressKeyFrames, rotationKeyFrames: rotationKeyFrames }});
}