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

const paths = ["chests/moon_dungeon", "chests/mars_dungeon", "chests/venus_dungeon"];

let cooldown
function hint(player, tier) {
    if (cooldown) return
    player.sendMessage(`I will propably need a Tier ${tier} Dungeon Key to unlock this!`)
    cooldown = system.runTimeout(() => {cooldown = undefined}, 100)
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
            block.setPermutation(block.permutation.withState('cosmos:chest_state', 'unlocked'));
            
            let loot = world.getLootTableManager().getLootTable(paths[tier - 1]);
            loot = world.getLootTableManager().generateLootFromTable(loot);
            let indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
                25, 26
            ];
            const reward = select_random_item(rewards[tier - 1]);
            loot.push(new ItemStack(reward));

            //fisher-yates shuffle
            for(let i = 26; i > 0; i--){
                let rand = Math.floor(Math.random() * (i + 1));
                [indexes[i], indexes[rand]] = [indexes[rand], indexes[i]];
            }
            let container = block.getComponent("minecraft:inventory").container;

            for(let i = -1; i < (loot.length - 1);){
                i++;
                container.setItem(indexes[i], loot[i])
            }

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