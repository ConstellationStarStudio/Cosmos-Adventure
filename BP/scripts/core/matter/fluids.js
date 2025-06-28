import { world, BlockPermutation, ItemStack, system } from "@minecraft/server"
import { compare_position, get_entity, load_dynamic_object, location_of_side } from "../../api/utils"
import { get_data } from "../machines/Machine"

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

system.beforeEvents.startup.subscribe(({itemComponentRegistry}) => {
    itemComponentRegistry.registerCustomComponent("cosmos:bucket", {
        onUseOn({source:player, itemStack:item, blockFace, block}) {
            const against = block[faces[blockFace]]()
            if (against.typeId != 'minecraft:air') return
            const liquid = liquids.find(liquid => liquid.bucket == item.typeId)
            if (!liquid) return
            against.setType(liquid.block)
            if (player.getGameMode() == 'Creative') return
            player.getComponent('equippable').setEquipment('Mainhand', new ItemStack('bucket'))
        }
    })
})

export function output_fluid(fluid_type, entity, block, fluid) {
    const data = get_data(entity)
    const target_location = location_of_side(block, data[fluid_type].output)
    if (!target_location || fluid == 0) return fluid
    const target_block = block.dimension.getBlock(target_location)

    if (target_block.typeId == "cosmos:fluid_pipe") {
        return fluid
    } else {
        const target_entity = get_entity(entity.dimension, target_location, `has_${fluid_type}_input`)
        if (!target_entity) return fluid
        
        const target_capacity = get_data(target_entity)[fluid_type].capacity
        const target_fluid = load_dynamic_object(target_entity, 'machine_data')?.[fluid_type] ?? 0
        if (target_fluid == target_capacity) return fluid
        
        const oi = location_of_side(target_block, get_data(target_entity)[fluid_type].input)
        if (!compare_position(entity.location, oi)) return fluid

        const space = target_capacity - target_fluid
        return fluid - Math.min(fluid, space)
    }
}

export function input_fluid(fluid_type, entity, block, fluid) {
    const data = get_data(entity)
    const source_location = location_of_side(block, data[fluid_type].input)
    if (!source_location || fluid == data[fluid_type].capacity) return fluid
    const source_block = block.dimension.getBlock(source_location)

    if (source_block.typeId == "cosmos:fluid_pipe") {
        return fluid
    } else {
        const source_entity = get_entity(entity.dimension, source_location, `has_${fluid_type}_output`)
        if (!source_entity) return fluid
        
        const source_fluid = load_dynamic_object(source_entity, 'machine_data')?.[fluid_type] ?? 0
        if (source_fluid == 0) return fluid
        
        const io = location_of_side(source_block, get_data(source_entity)[fluid_type].output)
        if (!compare_position(entity.location, io)) return fluid
        
        return Math.min(fluid + source_fluid, data[fluid_type].capacity)
    }
}