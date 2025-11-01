import { world, BlockPermutation, ItemStack, system } from "@minecraft/server"

function evaporate(block) {
    const liquid = block.permutation
    const height = liquid.getState("cosmos:height")
    const source = liquid.getState("cosmos:source")
    if (source) return
    if (height == 1) block.setType("minceaft:air")
    else block.setPermutation(liquid.withState('cosmos:height', height - 1))
}

const liquids = [
    {block: "cosmos:oil", bucket: "cosmos:oil_bucket"},
    {block: "cosmos:fuel", bucket: "cosmos:fuel_bucket"},
]
// world.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
// 	blockComponentRegistry.registerCustomComponent("cosmos:liquid", {
//         // onTick({block, dimension}){
//         //     const liquid = block.permutation
//         //     const height = liquid.getState("cosmos:height")
//         //     const source = liquid.getState("cosmos:source")
            
//         //     const neighbors = [block.north(), block.east(), block.south(), block.west()]
//         //     const has_source = block.permutation.getState('cosmos:source') || neighbors.find(side => {
//         //         const higher = side.typeId == block.typeId && source_height <= side.permutation?.getState('cosmos:height')
//         //         return side.permutation?.getState('cosmos:source') || higher
//         //     })
//         //     if (!has_source) evaporate(block)
//         //     for (const [i, side] of neighbors.entries()) {
//         //         const side_height = side?.permutaion?.getState('cosmos:height')
//         //         const can_flow = (side_height < source_height || side.typeId == "minecraft:air") && source_height > 1
//         //         if (!can_flow || has_source) continue
//         //         dimension.setBlockPermutation(side.location, block.permutation.withState("cosmos:height", source_height - 1).withState("cosmos:source", false))
//         //     }
//         // }
//         // onPlayerInteract({player, block}) {
//         // }
//     })
// })

world.beforeEvents.playerInteractWithBlock.subscribe(({block, player, itemStack:item, isFirstEvent}) => {
    if (!isFirstEvent || !item) return
    const equipment = player.getComponent('equippable')
    if (item.typeId == "minecraft:bucket") { //pickup liquid
        const bucket = liquids.find(liquid => liquid.block == block.typeId)?.bucket
        if (!bucket) return
        system.run(()=> {
            block.setType('air')
            if (item.amount == 1) equipment.setEquipment('Mainhand', new ItemStack(bucket))
            else {
                equipment.setEquipment('Mainhand', item.decrementStack())
                player.give(bucket)
            }
        })
    }
})

const faces = {
    Up: 'above',
    Down: 'below',
    North: 'north',
    East: 'east',
    West: 'west',
    South: 'south',
}

world.beforeEvents.worldInitialize.subscribe(({itemComponentRegistry}) => {
    itemComponentRegistry.registerCustomComponent("cosmos:bucket", {
        onUseOn({source:player, itemStack:item, blockFace, block}) {
            const against = block[faces[blockFace]]()
            if (against.typeId != 'minecraft:air') return
            const liquid = liquids.find(liquid => liquid.bucket == item.typeId)
            if (!liquid) return
            against.setType(liquid.block)
            if (player.getGameMode() == 'creative') return
            player.getComponent('equippable').setEquipment('Mainhand', new ItemStack('bucket'))
        }
    })
})