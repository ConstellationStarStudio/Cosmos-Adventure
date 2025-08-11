import {system, BlockPermutation} from "@minecraft/server";

//motion of platform, based on effects and applyImpulse
function HydraulicPlatformMotion(player, entity, effect, info){
    entity.addEffect(effect, 9999, {amplifier: 4, showParticles: false})
    player.inputPermissions.setPermissionCategory(6, false);
    player.inputPermissions.setPermissionCategory(7, false);
    player.inputPermissions.setPermissionCategory(8, false);

    let playerSeat = player.dimension.spawnEntity('cosmos:player_seat', {x: player.location.x, y: entity.location.y + 1.6, z: player.location.z});
    playerSeat.getComponent('minecraft:rideable').addRider(player);
    let motion = system.runInterval(() => {
        if(!entity.isValid || !playerSeat.isValid || (effect == 'slow_falling')? entity.location.y < (info.end.y): entity.location.y > (info.end.y + 1.1)){

            info.blocks.forEach((element) => {
                if(element.typeId == "cosmos:hydraulic_platform") element.setPermutation(element.permutation.withState("cosmos:is_open", false));
            });

            let player_loc = player.location;
            system.runTimeout(() => {
                entity?.remove();
                player.inputPermissions.setPermissionCategory(6, true);
                player.inputPermissions.setPermissionCategory(7, true);
                player.inputPermissions.setPermissionCategory(8, true);
                player.teleport({x: player_loc.x, y: player_loc.y - ((effect == 'levitation')? 0.3: 0), z: player_loc.z})
                playerSeat?.remove();
            }, 3);
            system.clearRun(motion);
            return;
        }
        playerSeat.clearVelocity()
        playerSeat.applyImpulse({x: 0, y: entity.getVelocity().y, z: 0})
        if(!playerSeat.getComponent("minecraft:rideable").getRiders().length) playerSeat.getComponent("minecraft:rideable").addRider(player)
    });
}
//returns platform blocks for not full platfrom block
function getHydraulicPlatformBlock(block){
    let {x, y, z} = block.location;

    //so bassically it is 8 blocks of neighbors
    let possible_vectors = [[{x: x, y: y, z: z - 1}, {x: x - 1, y: y, z: z}, {x: x -1, y: y, z: z - 1}, [1, 3, 0, 2]],
    [{x: x - 1, y: y, z: z}, {x: x, y: y, z: z + 1}, {x: x -1, y: y, z: z + 1}, [0, 2, 3, 1]],
    [{x: x, y: y, z: z - 1}, {x: x + 1, y: y, z: z}, {x: x + 1, y: y, z: z -1}, [0, 2, 1, 3]],
    [{x: x, y: y, z: z + 1}, {x: x + 1, y: y, z: z}, {x: x+ 1, y: y, z: z + 1}, [3, 1, 2, 0]]];

    for(let vector of possible_vectors){
        let states = vector.pop();
        let blocks = vector.map((element) => block.dimension.getBlock(element));
        if(blocks.every((element) => element.typeId == "cosmos:hydraulic_platform" && !element.permutation.getState('cosmos:is_full'))){
            system.run(() => {
                for(let i = 0; i < 3;){
                    blocks[i].setPermutation(BlockPermutation.resolve("cosmos:hydraulic_platform", 
                    {'cosmos:rotation': states[i], 'cosmos:is_full': true}));
                    i++;
                }
            });
            return states[3];
        }
    }
}
//returns platfrom blocks, based on rotation
function getPlatformBlocks(rot, block){
    switch(rot){
        case 0:
            return [block.south(), block.east(), block.offset({x: 1, y: 0, z: 1})];
        case 1: 
            return [block.south(), block.west(), block.offset({x: -1, y: 0, z: 1})];
        case 2:
            return [block.west(), block.north(), block.offset({x: -1, y: 0, z: -1})];
        case 3:
            return [block.north(), block.east(), block.offset({x: 1, y: 0, z: -1})];
    }
}
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("cosmos:hydraulic_platform", {
        beforeOnPlayerPlace(event){
            let block_state = getHydraulicPlatformBlock(event.block);
            if(block_state != undefined) event.permutationToPlace = BlockPermutation.resolve("cosmos:hydraulic_platform", {'cosmos:is_main': true, 'cosmos:rotation': block_state, 'cosmos:is_full': true})
        },
        onPlayerBreak(event){
            if(event.brokenBlockPermutation.getState('cosmos:is_full')){
                let blockDestroyed = getPlatformBlocks(event.brokenBlockPermutation.getState('cosmos:rotation'), event.block)
                blockDestroyed.forEach((element) => element.setPermutation(BlockPermutation.resolve("cosmos:hydraulic_platform", {'cosmos:rotation': 0, 'cosmos:is_full': false, 'cosmos:is_main': false})))
            }
        },
        onTick(event){
            let block = event.block;
            let permutation = block.permutation;
            let states = permutation.getAllStates();
            if(!states['cosmos:is_main']) return;
            
            let blocks = getPlatformBlocks(states['cosmos:rotation'], block);
            if(!blocks.every((element) => element.typeId == "cosmos:hydraulic_platform")) return;

            let states_of_blocks = blocks.map((element) => [element, element.permutation.getAllStates()]);
            let {x, y, z} = block.center();
            let center = [{x: x + 0.5, y: y, z: z + 0.5}, 
            {x: x - 0.5, y: y, z: z + 0.5}, {x: x - 0.5, y: y, z: z - 0.5}, 
            {x: x + 0.5, y: y, z: z - 0.5}][states['cosmos:rotation']];

            let players = block.dimension.getPlayers({location: {x: center.x, y: center.y + 1, z: center.z}, maxDistance: 1});

            if(players.length > 0){
                states['cosmos:is_selected'] = true;
                states_of_blocks.forEach(element => element[1]['cosmos:is_selected'] = true);

                let current_player = players[0];
                let input = current_player.inputInfo;
                if(input.getButtonState("Jump") == "Pressed"  ||  input.getButtonState("Sneak") == "Pressed" && !current_player.getComponent("minecraft:riding")?.entityRidingOn){
                    let effect = (input.getButtonState("Jump") == "Pressed")? "levitation":
                    "slow_falling";
    
                    let other_platform = (input.getButtonState("Jump") == "Pressed")? block.dimension.getBlockFromRay({x: x, y: y + 1, z: z}, {x: 0, y: 1, z: 0}, {maxDistance: 15, includeTypes: ["cosmos:hydraulic_platform"]})?.block:
                    block.dimension.getBlockFromRay({x: x, y: y - 1, z: z}, {x: 0, y: -1, z: 0}, {maxDistance: 15, includeTypes: ["cosmos:hydraulic_platform"]})?.block;

                    let other_platform_states = other_platform?.permutation.getAllStates();
                    if(other_platform && !other_platform_states["cosmos:is_open"] && other_platform_states["cosmos:rotation"] == states["cosmos:rotation"]){
                        let blocks_upper = getPlatformBlocks(other_platform_states["cosmos:rotation"], other_platform);
                        let states_of_upper_blocks = blocks_upper.map((element) => [element, element.permutation.getAllStates()]);
                        
                        [[block, states], [other_platform, other_platform_states], ...states_of_blocks, ...states_of_upper_blocks].forEach(element => {
                            element[1]['cosmos:is_open'] = true;
                            element[0].setPermutation(BlockPermutation.resolve("cosmos:hydraulic_platform", element[1]));
                        });

                        let platform = block.dimension.spawnEntity('cosmos:hydraulic_platform', {x: center.x, y: current_player.location.y - ((effect == 'levitation')? 0.85: 0.4), z: center.z});

                        HydraulicPlatformMotion(current_player, platform, effect,
                            {end: {x: x, y: other_platform.location.y, z: z}, blocks: [block, ...blocks, other_platform, ...blocks_upper]});
                    }
                }

                block.setPermutation(BlockPermutation.resolve("cosmos:hydraulic_platform", states));
                states_of_blocks.forEach(element => element[0].setPermutation(BlockPermutation.resolve("cosmos:hydraulic_platform", element[1])));
            }else{
                if(!states["cosmos:is_selected"]) return;

                states["cosmos:is_selected"] = false;
                block.setPermutation(BlockPermutation.resolve("cosmos:hydraulic_platform", states));
                states_of_blocks.forEach(element => {
                    element[1]["cosmos:is_selected"] = false;
                    element[0].setPermutation(BlockPermutation.resolve("cosmos:hydraulic_platform", element[1]))
                });
            }
        }
    })
})