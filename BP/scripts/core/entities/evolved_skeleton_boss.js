import {system, world, BlockPermutation} from "@minecraft/server"

let evolved_skeletons = new Map();
//that's a direct port of original functions

function throwPlayer(boss, player){
    let player_loc = player.location;
    let boss_loc = boss.location;
    
    let pos_x = boss_loc.x - player_loc.x;
    let pos_z;

    for(pos_z = boss_loc.z - player_loc.z; pos_x * pos_x + pos_z * pos_z < 0.0001; pos_z = (Math.random() + Math.random()) * 0.01){
        pos_x = (Math.random() + Math.random()) * 0.01;
    }

    let direction = Math.sqrt(pos_x * pos_x + pos_z * pos_z);

    let motionX = 0 - pos_x / direction * 2.4;
    let motionY = pos_z/5;
    let motionZ = 0 - pos_z / direction * 2.4;

    if(motionY > 0.4000000059604645) motionY = 0.4000000059604645;
    
    player.applyKnockback({x: motionX, z: motionZ}, motionY);
}

function takePlayer(boss, player){
    let seat_entity = boss.dimension.spawnEntity("cosmos:gengrapple", boss.location)
    seat_entity.getComponent("minecraft:rideable").addRider(player);
    player.inputPermissions.setPermissionCategory(6, false);
    player.inputPermissions.setPermissionCategory(7, false);
    player.inputPermissions.setPermissionCategory(8, false);
    boss.playAnimation("animation.evolved_skeleton_boss.player_hold");
    let throw_timer = 40;
    let post_throw_timer = 20;


    let momentBeforeThrowing = system.runInterval(() => {
        if(throw_timer > 0) throw_timer--;

        if(throw_timer == 0){
            if(post_throw_timer == 20){
                seat_entity.getComponent("minecraft:rideable").ejectRider(player);
                
                player.inputPermissions.setPermissionCategory(6, true);
                player.inputPermissions.setPermissionCategory(7, true);
                player.inputPermissions.setPermissionCategory(8, true);

                seat_entity.remove();
            }
            post_throw_timer--;
        }

        if(seat_entity.isValid){
            let rotation = boss.getRotation().y;
            let offset = {x: Math.sin(-rotation/57.2957795147), 
            y: 2 * Math.cos((throw_timer + post_throw_timer) * 0.05), 
            z: Math.cos(rotation/57.2957795147)}
            
            seat_entity.teleport({x: boss.location.x + offset.x, y: boss.location.y + 3 + offset.y, z: boss.location.z + offset.z})
        }
        if(post_throw_timer == 18){
            throwPlayer(boss, player);
            boss.triggerEvent("cosmos:no_player")
            let evolved_skeletons_as_array = [...evolved_skeletons.entries()];
            let boss_in_list = evolved_skeletons_as_array.find(element => element[1].boss == boss.id);
            if(boss_in_list){
                boss_in_list[1].takenPlayer = false;
                evolved_skeletons.set(boss_in_list[0], boss_in_list[1]) 
            }

            system.clearRun(momentBeforeThrowing)
        }
    });
}

function get_block_indicator(location, dimension){
    let {x, y, z} = location;
    let vectors = [{x: 17, y: 8, z: -17}, {x: -17, y: 8, z: 17}, 
        {x: 17, y: 8, z: 17}, {x: -17, y: 8, z: -17}];

    for(let vector of vectors){
        let indicator = dimension.getBlock({x: x + vector.x, y: y, z: z + vector.z});
        if(indicator == undefined) return "not_load"
        if(indicator.typeId == "cosmos:moon_boss_indicator") return vector;
    }
    return undefined;
}
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent("cosmos:boss_block", {
       onTick(data){
        let loc = data.block.location;
        let loc_as_string = JSON.stringify(loc);
        let block_in_a_list = evolved_skeletons.get(loc_as_string);

        //adds an area to boss object if player enters the room
        let area = block_in_a_list?.area ?? get_block_indicator(loc, data.block.dimension);

        if(area == "not_load") return;
        if(!area){
            if(block_in_a_list?.boss) world.getEntity(block_in_a_list.boss)?.remove;

            data.block.setPermutation(BlockPermutation.resolve("cosmos:moon_dungeon_bricks"));
            return; 
        }
        //so bassicaly it checks if boss fight started
        //and remove boss if player leave
        if(!block_in_a_list){
            if(!data.block.dimension.getPlayers({location: {x: loc.x, y: loc.y, z: loc.z}, volume: area}).length) return;
            let boss = data.block.dimension.spawnEntity("cosmos:evolved_skeleton_boss", {x: loc.x + (area.x/2), y: loc.y + 1, z: loc.z + (area.z/2)});
            evolved_skeletons.set(loc_as_string, {boss: boss.id, dead: false, takenPlayer: false, area: area})

            let boss_fight = system.runInterval(() => {
                let status = evolved_skeletons.get(loc_as_string);
                if(!status){
                    system.clearRun(boss_fight)
                    return;
                }
                if(status.dead){
                    //boss.playAnimation()
                    system.runTimeout(() => {
                        //shoud do stuff
                    }, 100);
                    evolved_skeletons.delete(loc_as_string)
                    data.block.setPermutation(BlockPermutation.resolve("cosmos:moon_dungeon_bricks"));
                    data.block.dimension.getBlock({x: loc.x + area.x, y: loc.y, z: loc.z + area.z}).setPermutation(BlockPermutation.resolve("cosmos:moon_dungeon_bricks"));
                    system.clearRun(boss_fight)
                    return;
                }

                if(!boss?.isValid || data.block.dimension.getBlock(loc).typeId !== "cosmos:moon_boss_spawner"){
                    if(boss.isValid) boss.remove();
                    system.clearRun(boss_fight);
                    return;
                }
                if(!status.takenPlayer){
                    let player_to_take = boss.dimension.getPlayers({location: boss.location, maxDistance: 1.25, closest: 1})[0];
                    if(player_to_take){
                        status["takenPlayer"] = true;
                        boss.triggerEvent("cosmos:player")
                        takePlayer(boss, player_to_take)
                    }
                }
            },20);
        }else{
            if(!data.block.dimension.getPlayers({location: {x: loc.x, y: loc.y, z: loc.z}, volume: area}).length){
                world.getEntity(block_in_a_list.boss)?.remove();
                evolved_skeletons.delete(loc_as_string);
                world.sendMessage({"rawtext": [{"translate": "gui.skeleton_boss.message"}]});
            }
        }
       }
    })
});

world.afterEvents.entityDie.subscribe((data) => {
    if(data.deadEntity.typeId != "cosmos:evolved_skeleton_boss") return;
    let evolved_skeletons_as_array = [...evolved_skeletons.entries()]
    let boss_in_list = evolved_skeletons_as_array.find(element => element[1].boss == data.deadEntity.id);
    if(!boss_in_list) return;
    boss_in_list[1].dead = true;
    evolved_skeletons.set(boss_in_list[0], boss_in_list[1]);
});