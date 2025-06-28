import { world, ItemStack, system } from "@minecraft/server"

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent('cosmos:desh_pickaxe', {
        onMineBlock({ itemStack, source:player, minedBlockPermutation }) {
            const equipment = player.getComponent('equippable')
            const tool = equipment.getEquipment("Mainhand")
            // change it to the slimeling eggs once we add them
            if (!["minecraft:lime_shulker_box"].includes(minedBlockPermutation.type.id)) return
            const enchants = itemStack.getComponent('enchantable')
            if (!enchants.hasEnchantment('silk_touch')) return
            const slimy_desh_pickaxe = new ItemStack('cosmos:slimy_desh_pickaxe')
            slimy_desh_pickaxe.getComponent('enchantable').addEnchantments(enchants.getEnchantments())
            slimy_desh_pickaxe.getComponent('durability').damage = tool.getComponent('durability').damage
            slimy_desh_pickaxe.nameTag = tool.nameTag
            equipment.setEquipment('Mainhand', slimy_desh_pickaxe)
        }
    })
})

world.afterEvents.entityHitBlock.subscribe(({hitBlock:block, damagingEntity:player, hitBlockPermutation:perm}) => {
    const tool = player.getComponent('equippable').getEquipment("Mainhand")
    if (tool?.typeId != "cosmos:slimy_desh_pickaxe") return
    // change it to creeper egg once we add it
    if (block.typeId != "minecraft:sniffer_egg") return
    // block.setPermutation(perm.withState('cosmos:unbreakable', false))
    block.setPermutation(perm.withState("cracked_state", "max_cracked"))
})