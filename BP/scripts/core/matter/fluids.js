import { world, ItemStack, system } from "@minecraft/server"
import { compare_position, get_entity, load_dynamic_object, location_of_side, save_dynamic_object } from "../../api/utils"
import { get_data } from "../machines/Machine"
import { create_network, fluid_network, save_network} from "./fluid_network"
import { get_direction, pipe_same_side } from "../blocks/fluid_pipe"

function evaporate(block) {
    const liquid = block.permutation
    const height = liquid.getState("cosmos:height")
    const source = liquid.getState("cosmos:source")
    if (source) return
    if (height == 1) block.setType("minecraft:air")
    else block.setPermutation(liquid.withState('cosmos:height', height - 1))
}

const liquids = [
    {block: "cosmos:oil", bucket: "cosmos:oil_bucket"},
    {block: "cosmos:fuel", bucket: "cosmos:fuel_bucket"},
]

export const fluid_textures = {
    'o2_gas': 1,
    'liquid_o2': 2,
    'n2_gas': 3,
    'liquid_n2': 4,
    'methane': 5,
    'fuel': 6,
}

const fluid_canisters = {
    o2: "cosmos:o2_canister", 
    n2: "cosmos:n2_canister",
    fuel: "cosmos:fuel_canister",
    oil: "cosmos:oil_canister",
    
    "cosmos:o2_canister": "o2", 
    "cosmos:n2_canister": "n2",
    "cosmos:fuel_canister": "fuel",
    "cosmos:oil_canister": "oil",
}
const fluid_buckets = {
    water: "minecraft:water_bucket",
    fuel: "cosmos:fuel_bucket",
    oil: "cosmos:oil_bucket",

    "minecraft:water_bucket": "water",
    "cosmos:fuel_bucket": "fuel",
    "cosmos:oil_bucket": "oil",
}

const liquid_lores = {
    "cosmos:o2_canister": "Oxygen: ",
    "cosmos:n2_canister": "Nitrogen: ",
    "cosmos:fuel_canister": "Fuel: ",
    "cosmos:oil_canister": "Oil: "
}

const empty_canister = (type = "cosmos:empty_canister") => { // using a function to get a new object
    const item = new ItemStack(type)
    item.getComponent('durability').damage = 1000
    return item
}

export const fluid_names = {
    undefined: "Empty",
    oil: "Oil",
    fuel: "Fuel",
    air: "Atmospheric Gases",
    o2: "Oxygen Gas",
    h2: "Hydrogen Gas",
    n2: "Nitrogen Gas",
    co2: "Carbon Dioxide",
    methane: "Methane Gas",
    helium: "Helium Gas",
    argon: "Argon Gas",
    liquid_oxygen: "Liquid Oxygen",
    liquid_nitrogen: "Liquid Nitrogen",
    liquid_methane: "Liquid Methane",
    liquid_argon: "Liquid Argon",
    bacterial_sludge: "Bacterial Sludge",
    sulphuric_acid: "Sulfuric Acid",
}
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
//         //         const side_height = side?.permutation?.getState('cosmos:height')
//         //         const can_flow = (side_height < source_height || side.typeId == "minecraft:air") && source_height > 1
//         //         if (!can_flow || has_source) continue
//         //         dimension.setBlockPermutation(side.location, block.permutation.withState("cosmos:height", source_height - 1).withState("cosmos:source", false))
//         //     }
//         // }
//         // onPlayerInteract({player, block}) {
//         // }
//     })
// })

// pickup liquids
world.beforeEvents.playerInteractWithBlock.subscribe(({block, player, itemStack:item, isFirstEvent}) => {
    if (!isFirstEvent || !item) return
    const equipment = player.getComponent('equippable')
    if (item.typeId != "minecraft:bucket") return
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
})

const faces = {
    Up: 'above', Down: 'below',
    North: 'north', South: 'south',
    East: 'east', West: 'west',
}

export const bucket_component = {
    onUseOn({source:player, itemStack:item, blockFace, block}) {
        const against = block[faces[blockFace]]()
        if (against.typeId != 'minecraft:air') return
        const liquid = liquids.find(liquid => liquid.bucket == item.typeId)
        if (!liquid) return
        against.setType(liquid.block)
        if (player.getGameMode() == 'Creative') return
        player.getComponent('equippable').setEquipment('Mainhand', new ItemStack('bucket'))
    }
}

export function output_fluid(fluid_data, entity, block, fluid) {
    if(system.currentTick % 20) return fluid;
    
    /* debug purposes
    prints fluid system object and all registered pipes
    if you wanna delete registered pipes and system use world.clearDynamicProperties();
    note: it might clean stations too
    console.warn(JSON.stringify(world.getDynamicPropertyIds(), fluid_network))
    console.warn(JSON.stringify(fluid_network))*/
    
    const data = get_data(entity)
    const target_location = location_of_side(block, data[fluid_data.slot].output)
    if (!target_location) return fluid
    const target_block = block.dimension.getBlock(target_location)
    let direction = {x: block.location.x - Math.floor(target_location.x),
        y: block.location.y - Math.floor(target_location.y), 
        z: block.location.z - Math.floor(target_location.z)
    }
    direction = get_direction(direction);

    let condition_state = (fluid_data.liquid_type == "g") ? 1: 2;
    if (target_block.hasTag("fluid_pipe") && target_block.permutation.getState(pipe_same_side[direction]) >= condition_state){
        let network_id = world.getDynamicProperty(target_block.dimension.id + JSON.stringify(target_block.location));
        if(!network_id){
            fluid = create_network(target_block, fluid_data.type, fluid_data.liquid_type, fluid);
            return fluid;
        }else if(fluid_network[network_id]?.t == fluid_data.type && fluid_network[network_id]?.l == fluid_data.liquid_type){
            let network = fluid_network[network_id];
            let capacity = Math.min(network.p * 200 - network.c, fluid);
            network.c += capacity;
            fluid -= capacity;
            if(network.c > 0) network.e = true;
            else network.e = false;
            save_network();
        }
    }
    return fluid;
}

export function input_fluid(fluid_data, entity, block, fluid) {
    if(system.currentTick % 20) return [fluid, fluid_data.type];
    const data = get_data(entity)
    const source_location = location_of_side(block, data[fluid_data.slot].input)
    if (!source_location || fluid == data[fluid_data.slot].capacity) return [fluid, fluid_data.type]
    const source_block = block.dimension.getBlock(source_location)

    if (source_block?.hasTag("fluid_pipe")) {
        let network = world.getDynamicProperty(source_block.dimension.id + JSON.stringify(source_block.location));
        network = fluid_network[network];
        if(network && fluid_data.type == undefined && network.l == fluid_data.liquid_type){
            fluid_data.type = network.t;
        }
        if(network && network.t == fluid_data.type && network.l == fluid_data.liquid_type){
            let extracted_fluid = Math.min(data[fluid_data.slot].capacity - fluid, Math.floor(network.c/(network.i ?? 1)));
            network.c -= extracted_fluid;
            fluid += extracted_fluid;
            save_network();
            return [fluid, fluid_data.type];
        }
    }
    return [fluid, fluid_data.type];
}

export function load_from_item(amount, fluid_type, capacity, container, slot) {
    if (amount == capacity) return capacity
	const item = container.getItem(slot)
    if(!item) return amount
    // handle buckets
    if (item.typeId == fluid_buckets[fluid_type]) {
        if (amount + 1000 > capacity) return amount
        container.setItem(slot, new ItemStack("bucket"))
        return amount + 1000
    }
    // handle creative canister
    if (item.typeId == 'cosmos:creative_canister') {
        const fluid = item.getDynamicProperty('fluid')
        if (fluid != fluid_type) return amount
        return capacity
    }
    // handle canisters
    if (item.typeId != fluid_canisters[fluid_type]) return amount
    return load_from_canister({canister: item, amount, capacity, container, slot})
}

// this function loses some canister_amount to make the tank_amount reach 100% 
export function load_from_canister({canister, amount, capacity, container, slot, ratio = 1, rate, creative}) {
    if (creative) return rate ? Math.min(capacity, amount + ((rate * 2.5 * ratio | 0) / ratio | 0)) : capacity
    if (amount == capacity) return capacity
    const durability = canister.getComponent('durability')
    const canister_amount = durability.maxDurability - durability.damage
    const space = capacity - amount
    const draw = rate ? Math.floor(Math.min(rate * 2.5, space)) : space
    const value = Math.min(canister_amount, !rate || draw == space ? Math.ceil(draw * ratio) : Math.floor(draw * ratio))
    if (value) container.setItem(slot, drain_canister(canister, durability, value)) 
    return Math.min(capacity, amount + Math.floor(value / ratio))
}

export function load_to_item(amount, fluid_type, container, slot){
    if(amount == 0) return 0 // tank is empty
	const item = container.getItem(slot)
    if (!item) return amount // no item to receive the fluid
    // tank has at least 1000mB, the input is a single empty bucket
    if (amount >= 1000 && item.typeId == "minecraft:bucket" && item.amount == 1) {
        container.setItem(slot, new ItemStack(fluid_buckets[fluid_type])) // fill the bucket
        return amount - 1000 // consume 1000mB
    }
    // handle canisters
    return load_to_canister(item, amount, fluid_type, container, slot)
}

export function load_to_canister(canister, amount, fluid_type, container, slot) {
    const empty = canister.typeId == "cosmos:empty_canister" // is it empty?
    const canister_type = fluid_canisters[fluid_type] // what type of canister to fill?
    if (canister.typeId != canister_type && !empty) return amount // if empty or contains the same fluid
    if (empty) canister = empty_canister(canister_type) // if empty set its type
    const durability = canister.getComponent('minecraft:durability')
    if (!durability.damage) return amount // the canister is full
    const filled = Math.min(amount, durability.damage) // take the remaining amount or the remaining space
    durability.damage -= filled // fill the durability bar
    canister.setLore([`§r§7${liquid_lores[canister_type]}${durability.maxDurability - durability.damage}`]) // update the lore
    container.setItem(slot, canister) // update the item
    return amount - filled // consume the fluid
}

// (Unused) this function doesn't let the tank_amount reach 100% if it will lose canister_amount
export function lossless_load_from_canister({canister, tank_amount, capacity, container, slot, ratio = 1}) {
    if (tank_amount == capacity) return capacity
    const durability = canister.getComponent('durability')
    const canister_amount = durability.maxDurability - durability.damage
    const moved = Math.min(canister_amount, Math.floor((capacity - tank_amount) / ratio))
    const remaining = canister_amount - moved
    if (canister_amount != remaining) container.setItem(slot, set_canister(canister, remaining))
    return tank_amount + moved * ratio
}

// (Unused) exact java port of the function that fills oxygen machines from canisters
export function lossless_gradual_load_from_canister({canister, tank_amount, capacity, container, slot, ratio = 1, rate}) {
    if (tank_amount == capacity) return capacity
    const space = capacity - tank_amount
    const durability = canister.getComponent('durability')
    const canister_amount = durability.maxDurability - durability.damage
    const draw = Math.floor(rate ? Math.min(rate * 2.5, space) : space)
    const moved = Math.min(canister_amount, Math.floor(draw * ratio))
    const remaining = canister_amount - moved
    if (canister_amount != remaining) container.setItem(slot, set_canister(canister, remaining))
    return tank_amount + Math.floor(moved / ratio)
}

function set_canister(canister, amount, fluid_type) {
    if (amount <= 0) return empty_canister()
    const item_id = fluid_canisters[fluid_type]
    if (canister.typeId == "cosmos:empty_canister") canister = new ItemStack(item_id)
    const durability = canister.getComponent('durability')
    amount = Math.min(amount, durability.maxDurability)
    durability.damage = durability.maxDurability - amount
    canister.setLore([`§r§7${liquid_lores[canister.typeId]}${amount}`])
    return canister
}

function drain_canister(canister, durability, value) {
    if (value == 0) return canister
    const drained = durability.maxDurability - durability.damage - value
    if (drained <= 0) return empty_canister()
    durability.damage += value
    canister.setLore([`§r§7${liquid_lores[canister.typeId]}${drained}`])
    return canister
}