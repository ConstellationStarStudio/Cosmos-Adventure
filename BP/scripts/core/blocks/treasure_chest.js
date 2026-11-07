import { ItemStack, system, world } from "@minecraft/server";
import { select_random_item } from "api/utils";

const tiers = {
    "cosmos:tier1_key": "cosmos:tier1_treasure_chest",
    "cosmos:tier2_key": "cosmos:tier2_treasure_chest",
    "cosmos:tier3_key": "cosmos:tier3_treasure_chest",
}

const rewards = [
    ['cosmos:schematic_buggy', 'cosmos:schematic_rocket_t2'],
    ['cosmos:schematic_astro_miner', 'cosmos:schematic_cargo_rocket', 'cosmos:schematic_rocket_t3'],
    ['cosmos:volcanic_pickaxe', 'cosmos:shield_controller'],
]


let cooldown
function hint(player, tier) {
    if (cooldown) return
    player.sendMessage(`I will propably need a Tier ${tier} Dungeon Key to unlock this!`)
    cooldown = system.runTimeout(() => {cooldown = undefined}, 100)
}

export const treasure_chest_component = {
    onPlayerInteract({block, player, dimension}) {
        const chest = block.permutation;
        if (chest.getState('cosmos:chest_state') == 'unlocked') {
            block.dimension.playSound('random.chestopen', block.location)
            block.setPermutation(chest.withState('cosmos:chest_state', 'open'))
        }
    }
}

world.beforeEvents.playerInteractWithBlock.subscribe((event) =>  {
    if(!event.block.hasTag("dungeon_chest")) return;
    let block = event.block; let item = event.itemStack; let player = event.player;
    if(block.permutation.getState("cosmos:chest_state") == 'locked'){
        event.cancel = true;
        const tier = +(block.typeId.replace('cosmos:tier', '').replace('_treasure_chest', ''))
        if (tiers[item?.typeId] != block.typeId) {
            hint(player, tier); return
        }
        system.run(() => {
            block.setPermutation(block.permutation.withState('cosmos:chest_state', 'unlocked'))
            if (player.getGameMode() != 'Creative') player.runCommand(`clear @s ${item.typeId} 0 1`)
        });
    }
})

world.afterEvents.blockContainerOpened.subscribe(({block: chest}) => {
    if(chest.permutation.getState('cosmos:chest_state') == 'unlocked') {
        chest.dimension.playSound('random.chestopen', chest.location)
        chest.setPermutation(chest.permutation.withState('cosmos:chest_state', 'open'))
    }
}, {blockFilter: {includeTags: ["dungeon_chest"]}});