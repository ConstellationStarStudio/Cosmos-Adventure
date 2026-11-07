import { ItemStack } from "@minecraft/server"

export const machine_buttons = new Map()

export function setup_ui_button(machine, slot, text, type = "block") {
    const container = machine.getComponent('minecraft:inventory').container
    const button = new ItemStack('cosmos:ui_button')
    button.setDynamicProperty("machine", type == "block" ? machine.location: machine.id)
    button.setDynamicProperty('slot', slot)
    button.nameTag = text
    container.setItem(slot, button)
}