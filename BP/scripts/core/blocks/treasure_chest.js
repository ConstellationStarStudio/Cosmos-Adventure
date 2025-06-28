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

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent('cosmos:treasure_chest', {
        onPlayerInteract({block, player, dimension}) {
            const chest = block.permutation
            const equipment = player.getComponent("minecraft:equippable")
            const item = equipment.getEquipment("Mainhand")
            if (chest.getState('cosmos:chest_state') != 'locked') return
            const tier = +(block.typeId.replace('cosmos:tier', '').replace('_treasure_chest', ''))
            if (tiers[item?.typeId] != block.typeId) {
                hint(player, tier); return
            }
            world.structureManager.place(`treasures/tier${tier}`, dimension, block.location)
            system.run(()=> {
                const entity = dimension.getEntities({type: "cosmos:treasure_chest", closest: 1, location: block.bottomCenter()})[0]
                if (!entity) return
                const loot = entity.getComponent('inventory').container
                const slot = Math.floor(Math.random() * 27)
                const reward = select_random_item(rewards[tier - 1])
                loot.setItem(slot, new ItemStack(reward))
            })
            block.setPermutation(chest.withState('cosmos:chest_state', 'unlocked'))
            if (player.getGameMode() != 'Creative') player.runCommand(`clear @s ${item.typeId} 0 1`)
        }
    })
})

world.afterEvents.playerInteractWithEntity.subscribe(({target:entity})=> {
    if (entity.typeId != "cosmos:treasure_chest") return
    const chest = entity.dimension.getBlock(entity.location)
    if (!Object.values(tiers).includes(chest.typeId)) return
    if (chest.permutation.getState('cosmos:chest_state') != 'open') {
        entity.dimension.playSound('random.chestopen', chest.location)
        chest.setPermutation(chest.permutation.withState('cosmos:chest_state', 'open'))
    }
})

world.afterEvents.entityHitEntity.subscribe(({damagingEntity:player, hitEntity:entity})=> {
    if (player.typeId != "minecraft:player") return
    if (entity.typeId != "cosmos:treasure_chest") return
    if (player.getGameMode() != 'Creative') return
    entity.runCommand(`setblock ~~~ air destroy`)
    entity.kill(); entity.remove()
})