import { world, BlockPermutation, ItemStack, system } from "@minecraft/server"
import { update_battery } from "./electricity"
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
const liquid_canisters = {
    canisters: {
        "cosmos:o2_canister": "o2", 
        "cosmos:n2_canister": "n2",
        "cosmos:fuel_canister": "fuel",
        "cosmos:oil_canister": "oil"
    },
    buckets: {
        "cosmos:fuel_bucket": "fuel",
        "cosmos:oil_bucket": "oil"
    }
}
const liquid_canisters_reversed = {
    canisters: {
        "o2": "cosmos:o2_canister", 
        "n2": "cosmos:n2_canister",
        "fuel": "cosmos:fuel_canister",
        "oil": "cosmos:oil_canister"
    },
    buckets: {
        "fuel": "cosmos:fuel_bucket",
        "oil": "cosmos:oil_bucket" 
    }
}
const liquid_lores = {
    "cosmos:o2_canister": "Oxygen: ",
    "cosmos:n2_canister": "Nitrogen: ",
    "cosmos:fuel_canister": "Fuel: ",
    "cosmos:oil_canister": "Oil: "
}

export const fluid_names = {
    undefined: "Empty",
    oil: "Oil",
    fuel: "Fuel",
    air: "Atmospheric Gases",
    o2_gas: "Oxygen Gas",
    h2_gas: "Hydrogen Gas",
    n2_gas: "Nitrogen Gas",
    co2_gas: "Carbon Dioxide",
    methane_gas: "Methane Gas",
    helium_gas: "Helium Gas",
    argon_gas: "Argon Gas",
    liquid_oxygen: "Liquid Oxygen",
    liquid_nitrogen: "Liquid Nitrogen",
    liquid_methane: "Liquid Methane",
    liquid_argon: "Liquid Argon",
    bacterial_sludge: "Bacterial Sludge",
    sulphuric_acid: "Sulphuric Acid",
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

export function load_to_canister(liquid_amount, liquid_type, container, slot){
    if(!liquid_amount) return liquid_amount;
	const canister = container.getItem(slot);

    if(!canister) return liquid_amount;
    if(liquid_amount >= 1000 && canister.typeId == "minecraft:bucket" && canister.amount == 1){
        container.setItem(slot, new ItemStack(liquid_canisters_reversed.buckets[liquid_type]));
        liquid_amount -= 1000;
        return liquid_amount;
    }
    if(canister.typeId == "cosmos:empty_canister" || canister.typeId == liquid_canisters_reversed.canisters[liquid_type]){
        let canister_durability = canister.getComponent('minecraft:durability'); 
        let canister_capacity = canister_durability.maxDurability - canister_durability.damage;
        canister_capacity += Math.min(liquid_amount, canister_durability.damage);
        liquid_amount -= Math.min(liquid_amount, canister_durability.damage);
        container.setItem(slot, update_canister(canister, canister_capacity, liquid_type));
        return liquid_amount;
    }
}

export function load_from_canister_instant(liquid_amount, liquid_type, entity, slot) {
    const data = get_data(entity);
    let machine_capacity = liquid_type ? data[liquid_type].capacity: data.gas.capacity;

    if(liquid_amount === machine_capacity) return {amount: liquid_amount, liquid_type};
	const container = entity.getComponent('minecraft:inventory').container;
	const canister = container.getItem(slot);
    if(!canister) return {amount: liquid_amount, liquid_type};

    //checks if bucket in a slot
    if(canister.typeId == liquid_canisters_reversed.buckets[liquid_type]){
        container.setItem(slot, new ItemStack("bucket"))
        liquid_amount = Math.min(liquid_amount + 1000, data[liquid_type].capacity);
        return {amount: liquid_amount, liquid_type}
    }
    //check if canister in a slot
    //if a liquid type is undefined it transfer it to liquid type based on canister
    if(!liquid_canisters.canisters[canister.typeId] || (liquid_type && canister.typeId != liquid_canisters_reversed.canisters[liquid_type])) return {amount: liquid_amount, liquid_type};

    let canister_durability = canister.getComponent('minecraft:durability'); 
    let canister_capacity = canister_durability.maxDurability - canister_durability.damage;

    liquid_type = liquid_type ?? liquid_canisters.canisters[canister.typeId]; 

    const space = machine_capacity - liquid_amount;
    liquid_amount += Math.min(space, canister_capacity);
    canister_capacity -= Math.min(space, canister_capacity);
    container.setItem(slot, update_canister(canister, canister_capacity));

    return {amount: liquid_amount, liquid_type};        
}

export function load_from_canister({item, amount, capacity, ratio, container, slot}) {
    const durability = item.getComponent('minecraft:durability')
    const canister_amount = durability.maxDurability - durability.damage
    const uncompressed = canister_amount * ratio
    const space = capacity - amount
    const remaining_canister_amount = Math.floor(Math.max(0, (uncompressed - space) / ratio))
    if (canister_amount != remaining_canister_amount) container.setItem(slot, update_canister(item, remaining_canister_amount))
    return Math.min(capacity, amount + uncompressed)
}

export function load_from_canister_gradual(liquid_amount, liquid_type, entity, slot){
    const data = get_data(entity);
    let machine_capacity = data[liquid_type].capacity;

    if(liquid_amount === machine_capacity) return liquid_amount;
	const container = entity.getComponent('minecraft:inventory').container;
	const canister = container.getItem(slot);
    if(!canister || canister.typeId != liquid_canisters_reversed.canisters[liquid_type]) return liquid_amount;

    let canister_durability = canister.getComponent('minecraft:durability'); 
    let canister_capacity = canister_durability.maxDurability - canister_durability.damage;

    const space = machine_capacity - liquid_amount;
    let liquid_draw = Math.floor(data[liquid_type].maxInput * 2.5 * 10);
    let converted_liquid = Math.min(canister_capacity, liquid_draw * 0.0926);
    liquid_amount += Math.min(space, Math.floor(converted_liquid/0.0926));
    canister_capacity -= Math.min(canister_capacity, Math.floor(converted_liquid));
    container.setItem(slot, update_canister(canister, canister_capacity));

    return liquid_amount;        
}

function update_canister(canister, fill, liquid_type = undefined){
    let durability = canister.getComponent('minecraft:durability');
    if(!fill){
        canister = new ItemStack("cosmos:empty_canister");
        canister.getComponent('minecraft:durability').damage = 1000;
        return canister;
    }else if(canister.typeId == "cosmos:empty_canister"){
        canister = new ItemStack(liquid_canisters_reversed.canisters[liquid_type]);
        durability = canister.getComponent('minecraft:durability');
    }
    fill = Math.min(durability.maxDurability, fill);
    durability.damage = durability.maxDurability - fill;
    canister.setLore([`§r§7${liquid_lores[canister.typeId]}${fill}`])
    return canister;
}