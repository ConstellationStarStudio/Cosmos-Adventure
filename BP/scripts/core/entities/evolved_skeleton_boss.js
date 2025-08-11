import {system, world, BlockPermutation} from "@minecraft/server"

let evolved_skeletons = new Map();
const difficult_number = {"Peaseful": 0, "Easy": 1, "Normal": 2, "Hard": 3};

//that's a direct port of original functions

function shootPlayer(boss, player){
    let player_loc = player.location;
    let boss_loc = boss.location;
    
    let arrow = boss.dimension.spawnEntity("minecraft:arrow", {x: boss_loc.x, y: boss_loc.y + 2, z: boss_loc.z});
    let pos_x = player_loc.x - boss_loc.x;
    let pos_z = player_loc.z - boss_loc.z;
    let pos_y = (player_loc.y - 0.8) + 0.6 - arrow.location.y;
    let distance = Math.sqrt(pos_x * pos_x + pos_z * pos_z)  * 0.20000000298023224;

    let projectile = arrow.getComponent("minecraft:projectile");
    projectile.airInertia = 1.6;
    projectile.owner = boss;
    projectile.shoot({x: pos_x, y: pos_y + distance, z: pos_z}, {uncertainty: 14 - difficult_number[world.getDifficulty()]});
}
function throwPlayer(boss, player, corners){
    let player_loc = player.location;
    let boss_loc = boss.location;
    
    if(Math.random() > 0.5){
        let pos_x = boss_loc.x - player_loc.x;
        let pos_z;

        for(pos_z = boss_loc.z - player_loc.z; pos_x * pos_x + pos_z * pos_z < 0.0001; pos_z = (Math.random() + Math.random()) * 0.01){
            pos_x = (Math.random() + Math.random()) * 0.01;
        }

        let direction = Math.sqrt(pos_x * pos_x + pos_z * pos_z);

        //in original value is 2.4 but i set 4.4
        let motionX = 0 - pos_x / direction * 4.4;
        let motionY = pos_z/5;
        let motionZ = 0 - pos_z / direction * 4.4;

        if(motionY > 0.4000000059604645) motionY = 0.4000000059604645;
    
        player.applyKnockback({x: motionX, z: motionZ}, motionY);
    }else{
        let closest_corner = corners.sort((vectorA, vectorB) => {
            let distanceA = Math.sqrt((vectorA.x - boss_loc.x) ** 2 + (vectorA.z- boss_loc.z) ** 2);
            let distanceB = Math.sqrt((vectorB.x - boss_loc.x) ** 2 + (vectorB.z- boss_loc.z) ** 2);
            return distanceA - distanceB;
        })[0];

        let vector_lenght = 10/Math.sqrt(closest_corner.x ** 2 + closest_corner.z ** 2)
        closest_corner.x *= vector_lenght;
        closest_corner.z *= vector_lenght;

        player.applyKnockback({x: closest_corner.x, z: closest_corner.z}, 0.1);
    }
}

function takePlayer(boss, player, corners){
    player.inputPermissions.setPermissionCategory(6, false);
    player.inputPermissions.setPermissionCategory(7, false);
    player.inputPermissions.setPermissionCategory(8, false);

    let seat_entity = boss.dimension.spawnEntity("cosmos:gengrapple", boss.location);

    seat_entity.getComponent("minecraft:rideable").addRider(player);
    boss.playAnimation("animation.evolved_skeleton_boss.player_hold");
    let throw_timer = 40;
    let post_throw_timer = 20;


    let momentBeforeThrowing = system.runInterval(() => {
        if(!boss.isValid){
            system.clearRun(momentBeforeThrowing);
            return;
        }
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
            
            seat_entity.teleport({x: boss.location.x + offset.x, y: boss.location.y + 4 + offset.y, z: boss.location.z + offset.z})
        }
        if(post_throw_timer == 18){
            throwPlayer(boss, player, corners);
            boss.triggerEvent("cosmos:no_player")
            boss.dimension.playSound("mob.evolved_skeleton_boss.laugh", boss.location)
            let evolved_skeletons_as_array = [...evolved_skeletons.entries()];
            let boss_in_list = evolved_skeletons_as_array.find(element => element[1].boss == boss.id);
            if(boss_in_list){
                boss_in_list[1].shouldShoot = true;
                evolved_skeletons.set(boss_in_list[0], boss_in_list[1]) 
                system.runTimeout(() => {
                    boss_in_list[1].takenPlayer = false;
                    evolved_skeletons.set(boss_in_list[0], boss_in_list[1]) 
                }, 60)
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

//main loop
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
            if(block_in_a_list?.boss) world.getEntity(block_in_a_list.boss)?.remove();

            data.block.setPermutation(BlockPermutation.resolve("cosmos:moon_dungeon_bricks"));
            return; 
        }
        //so bassicaly it checks if boss fight started
        //and remove boss if player leave
        let players_in_area = data.block.dimension.getPlayers({location: {x: loc.x, y: loc.y, z: loc.z}, volume: area}).filter((element) => element.getComponent("minecraft:health").currentValue !== 0);
        if(!block_in_a_list){
            if(!players_in_area.length) return;
            let boss = data.block.dimension.spawnEntity("cosmos:evolved_skeleton_boss", {x: loc.x + (area.x/2), y: loc.y + 1, z: loc.z + (area.z/2)});
            let arrow_event = world.afterEvents.projectileHitBlock.subscribe((data) => {
                if(data.source.typeId == "cosmos:evolved_skeleton_boss" && data.source.id == boss.id && data.projectile.isValid) data.projectile?.remove()
            });

            evolved_skeletons.set(loc_as_string, {boss: boss.id, dead: false, takenPlayer: false, shouldShoot: true, area: area, event: arrow_event})

            let interval_tick = 0;
            let boss_fight = system.runInterval(() => {
                interval_tick++;
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

                let spawner_status = data.block.dimension.getBlock(loc);
                if(!boss?.isValid || !spawner_status || spawner_status.typeId !== "cosmos:moon_boss_spawner"){
                    if(boss.isValid) boss.remove();
                    world.afterEvents.projectileHitBlock.unsubscribe(arrow_event)
                    system.clearRun(boss_fight);
                    return;
                }
                if(status.shouldShoot && !(interval_tick % 2)){
                    let attackable_player = boss.dimension.getPlayers({location: boss.location, maxDistance: 15, excludeGameModes: ["Spectator", "Creative"], closest: 1})[0];

                    if(attackable_player && attackable_player.isValid && attackable_player.getComponent("minecraft:health").currentValue) shootPlayer(boss, attackable_player)
                }
                if(!status.takenPlayer){
                    let player_to_take = boss.dimension.getPlayers({location: boss.location, maxDistance: Math.ceil(Math.random() * 5), closest: 1}).filter((element) => element.getComponent("minecraft:health").currentValue > 0)[0];
                    if(player_to_take){
                        status["takenPlayer"] = true;
                        status["shouldShoot"] = false;
                        boss.triggerEvent("cosmos:player")
                        let corners = [{x: loc.x + area.x, y: loc.y + 8, z: loc.z}, 
                            {x: loc.x, y: loc.y + 8, z: loc.z + area.z},
                            {x: loc.x, y: loc.y + 8, z: loc.z},
                            {x: loc.x + area.x, y: loc.y + 8, z: loc.z + area.z}
                        ];
                        takePlayer(boss, player_to_take, corners)
                    }
                }
            },10);
        }else{
            if(!players_in_area.length){
                world.afterEvents.projectileHitBlock.unsubscribe(block_in_a_list.event)
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
