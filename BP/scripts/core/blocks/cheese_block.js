import { BlockPermutation, system} from "@minecraft/server";

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("cosmos:cheese_block", {
        onPlayerInteract({player, block, dimension}) {
            let hunger = player.getComponent("minecraft:player.hunger");
            if(hunger.currentValue == hunger.effectiveMax || ['Creative', 'Spectator'].includes(player.getGameMode()) || !block) return
	        const cheese = block.permutation
	        const size = cheese.getState('cosmos:cheese_part_visibility')
            const air = BlockPermutation.resolve("minecraft:air")
            block.setPermutation(size > 0 ? cheese.withState('cosmos:cheese_part_visibility', size - 1) : air)
            let new_hunger_value = hunger.currentValue + 2;
            new_hunger_value = (new_hunger_value > hunger.effectiveMax)? hunger.effectiveMax:
            new_hunger_value;

            hunger.setCurrentValue(new_hunger_value);
            dimension.playSound("random.burp", player.location)
        },
        onPlayerBreak({brokenBlockPermutation:permutaion, dimension, block, player}) {
            if (permutaion.getState('cosmos:cheese_part_visibility') == 6) return
            const silk_touch = player.getComponent('equippable').getEquipment('Mainhand')
            ?.getComponent('enchantable')?.getEnchantment('silk_touch')
            if (!silk_touch) return
            dimension
            .getEntities({location: block.center(), maxDistance: 1, type: "minecraft:item"})
            .find(item => item.getComponent('minecraft:item').itemStack.typeId == "cosmos:cheese_block")
            ?.kill()
        }
    })
})
