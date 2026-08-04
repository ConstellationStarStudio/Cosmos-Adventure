import "../items/debug_items.js"
import "../items/wrench.js"
import "../items/grapple.js"
import "../items/dungeon_finder"
import "../items/desh_pickaxe.js"

import { world } from "@minecraft/server"
import { update_battery } from "./electricity"
import { tanks, update_tank } from "../../api/player/oxygen.js"
import { machine_buttons } from "../machines/MachineButtons.js"

world.afterEvents.playerInventoryItemChange.subscribe(({itemStack:item, slot, player}) => {
    if (item?.typeId == "cosmos:empty_canister" && item?.getComponent("minecraft:durability").damage != 1000){
        item.getComponent("minecraft:durability").damage = 1000;
        player.getComponent("minecraft:inventory").container.setItem(slot, item)
    }
    else if (item?.typeId == "cosmos:battery" && !item?.getLore().length){
        player.getComponent("minecraft:inventory").container.setItem(slot, update_battery(item, 0));
    }
    else if (item?.typeId == "cosmos:ui") player.getComponent("minecraft:inventory").container.setItem(slot)
    else if (item?.typeId == "cosmos:ui_button") {
        // this is for nasa work bench
        const id = item.getLore()[0]
        if (!id || !world.getEntity(id)) player.getComponent("minecraft:inventory").container.setItem(slot)
        // the behavior of the rest of machines
        // Using this because hoppers can pickup items faster than it takes the script to detect them
        const machine_id = item.getDynamicProperty('machine_id') // get the id of the machine entity
        const button_slot = item.getDynamicProperty('slot') // get the slot for that button
        if (typeof machine_id != 'string' || typeof button_slot != 'number') return // check if the button is linked to a machine
        const machine = world.getEntity(machine_id) // get the machine entity
        if (!machine || !machine.isValid) return // check if the entity is still valid
        machine_buttons.get(machine.typeId)[button_slot](machine, item) // run the button function
    }
    else if(item?.typeId && tanks[item.typeId] && !item?.getLore().length){
        player.getComponent("minecraft:inventory").container.setItem(slot, update_tank(item, 0));
    }
})

// Disabled because of Hoppers can pickup items faster than the script takes to detect them
// world.afterEvents.entitySpawn.subscribe(({entity}) => {
//     if (entity?.typeId != "minecraft:item" || !entity.isValid) return // check if the entity is an item
//     const item = entity.getComponent("minecraft:item")?.itemStack // convert the entity into an item stack
//     if (item?.typeId != "cosmos:ui_button") return; entity.remove() // check if the item is a ui button and remove it
//     const machine_id = item.getDynamicProperty('machine_id') // get the id of the machine entity
//     const slot = item.getDynamicProperty('slot') // get the slot for that button
//     if (machine_id == undefined || typeof slot != 'number') return // check if the button is linked to a machine
//     const machine = world.getEntity(machine_id) // get the machine entity
//     if (!machine || !machine.isValid) return // check if the entity is still valid
//     machine_buttons.get(machine.typeId)[slot](machine, item) // run the button action
// })

// Prevent UI Items from being picked up (Not Used because UI items aren't spawned as entities)
world.beforeEvents.entityItemPickup.subscribe(event => {
    const entity = event.item // get the item entity
    if (entity?.typeId != "minecraft:item" || !entity.isValid) return // check if the entity is an item
    const item = entity.getComponent("minecraft:item")?.itemStack // convert the entity into an item stack
    if (item?.typeId == "cosmos:ui_button") event.cancel = true // cancel the pickup event if that item is a ui button
})

// to remove the 'Has Custom Properties' text from UI buttons in other languages
world.afterEvents.worldLoad.subscribe(() => world.gameRules.showTags = false)
