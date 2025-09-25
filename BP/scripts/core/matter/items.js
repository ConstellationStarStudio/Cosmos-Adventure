import "../items/debug_items.js"
import "../items/wrench.js"
import "../items/grapple.js"
import "../items/dungeon_finder"
import "../items/desh_pickaxe.js"

import { world } from "@minecraft/server"
import { update_battery } from "./electricity"

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
        const id = item.getLore()[0]
        if (!id || !world.getEntity(id)) player.getComponent("minecraft:inventory").container.setItem(slot)
    }
})