import { BlockStates, world, MolangVariableMap, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import machines from "../machines/AllMachineBlocks";
import { location_of_side } from "../../api/utils";
import { select_solar_system } from "../../api/player/celestial_selector";

function swap(player, block, [state, value]) {
    block.setPermutation(block.permutation.withState(state, !value))
    debug(player, block, block.permutation)
}
function select(player, block, [state, value]) {
    const values = BlockStates.get(state).validValues
    const form = new ActionFormData()
    .title(state)
    values.forEach(option => {
        form.button((value == option ? '§2' : '§4') + option)
    })
    form.show(player).then((response) => {
        if (response.canceled) return
        block.setPermutation(block.permutation.withState(state, values[response.selection]))
    })
}

function change_state(player, block, perm) {
    const states = perm.getAllStates()
    const options = Object.keys(states).map(state => [[state, states[state]], typeof states[state] == "boolean" ? swap : select] )
    if (!options.length) return
    const form = new ActionFormData()
    .title("Block States")
    options.forEach(option => {
        const state = option[0][0]
        const value = option[0][1]
        const boolean = typeof value == "boolean"
        form.button(boolean ? ((value ? '§2' : '§4') + state) : `${state} : ${value}`)
    })
    form.show(player).then((response) => {
        if (response.canceled) return
        options[response.selection][1](player, block, options[response.selection][0])
    })
}

function show_connections(block) {
    const machine_type = block.typeId.split(':').pop()
    if (!Object.keys(machines).includes(machine_type)) return
    const machine = machines[machine_type]
    make_paricle(block.dimension, location_of_side(block, machine.energy.output), {r:1})
    make_paricle(block.dimension, location_of_side(block, machine.energy.input), {g:1})
}

function make_paricle(dimension, location, color) {
    if (!location) return
    const {x, y, z} = location
    const rgba = {red: color.r ?? 0, green:  color.g ?? 0, blue: color.b ?? 0, alpha: color.a ?? 1}
    const paricle_color = new MolangVariableMap()
    paricle_color.setColorRGBA('variable.color', rgba)
    dimension.spawnParticle('cosmos:dust', {x: x + 0.5, y: y + 0.5, z: z + 0.5}, paricle_color)
}

system.beforeEvents.startup.subscribe(({itemComponentRegistry}) => {
    itemComponentRegistry.registerCustomComponent("cosmos:debug_stick", {
        onUseOn({block, source:player, usedOnBlockPermutation:perm}) {
            const mode = player.getComponent('inventory').container.getItem(8)?.typeId
            if (mode == "minecraft:name_tag") {
                world.sendMessage(block.typeId)
            } 
            else if (mode == "minecraft:redstone") {
                show_connections(block)
            } else change_state(player, block, perm)
        }
    })
    itemComponentRegistry.registerCustomComponent("cosmos:property_rod", {
        onUse({source:player}) {
            if (player.isSneaking) {
                function take_property(player) {
                    new ModalFormData().title("Choose a Property").submitButton("Change")
                    .textField('property id:', "")
                    .show(player).then(({formValues, canceled}) => {
                        if (canceled) return
                        const property = formValues[0]
                        const value = player.getProperty(property)
                        if (value == undefined) {take_property(player); return}
                        take_value(player, property)
                    })
                }
                function take_value(player, property) {
                    const form = new ModalFormData().title("Change a Property").submitButton("Save")
                    const value = player.getProperty(property)
                    if (typeof value == "boolean") form.toggle("Bool Value:", {defaultValue: value})
                    if (typeof value == "number") form.textField("Number Value:", ""+value)
                    if (typeof value == "string") form.textField("String Value:", value)
                    form.show(player).then(({formValues, canceled}) => {
                        if (canceled) return
                        try {
                            if (typeof value == "boolean") player.setProperty(property, formValues[0])
                            if (typeof value == "number") player.setProperty(property, +formValues[0])
                            if (typeof value == "string") player.setProperty(property, formValues[0])
                        } catch {take_value(player, property)}
                    })
                }
                player.sendMessage('§cThis is not Implemented yet')
                return
                take_property(player)
            }
        }
    })
    itemComponentRegistry.registerCustomComponent("cosmos:dynamic_wand", {
        onUse({source:player}) {
            if (player.isSneaking) {
                const form = new ActionFormData().title("Choose a Dynamic Property")
                const properties = player.getDynamicPropertyIds()
                properties.forEach(id => {
                    form.button(id)
                })
                form.button("Add a Dynamic Property")
                form.show(player).then(({canceled, selection}) => {
                    if (canceled) return
                    if (selection == properties.length) {
                        player.sendMessage('§cThis is not Implemented yet')
                        return
                        new ModalFormData().title("Add a Dynamic Property").submitButton("Add")
                        .dropdown("Choose a Type", ["String", "Number", "Boolean", "Vector3"])
                        .textField("Enter the ID: ", "")
                        .textField("Enter the Value: ", "")
                        .show(player).then(({formValues, canceled}) => {
                            if (canceled) return
                            const value =
                            formValues[0] == "String" ? formValues[2] :
                            formValues[0] == "Number" ? + formValues[2] :
                            formValues[0] == "Boolean" ? ["1", "true"].includes(formValues[2]) :
                            formValues[0] == "Vector3" ? {x: formValues[2].split(' ')[0], y: formValues[2].split(' ')[1], z: formValues[2].split(' ')[2]} : undefined
                            player.setDynamicProperty(formValues[1], value)
                        })
                    }
                    else {
                        const id = properties[selection]
                        const value = player.getDynamicProperty(id)
                        new ModalFormData().title("Fill one").submitButton("Apply")
                        .label('§cstring is not Implemented yet')
                        .label('§cnumber is not Implemented yet')
                        .label('§cboolean is not Implemented yet')
                        .label('§cvector3 is not Implemented yet')
                        // .textField("Chnage to a string", "", typeof value == "string" ? {defaultValue: value} : undefined)
                        // .textField("Change to a number", "", typeof value == "number" ? {defaultValue: +value} : undefined)
                        // .textField("Chnage to a bool", "", typeof value == "boolean" ? {defaultValue: value ? "1" : "0"} : undefined)
                        // .textField("Chnage to a vector3", "", typeof value == "object" ? {defaultValue: `${value.x} ${value.y} ${value.z}`} : undefined)
                        .toggle("Delete")
                        .show(player).then(({formValues, canceled}) => {
                            if (canceled) return
                            player.setDynamicProperty(id,
                                formValues[4] ? undefined : value
                                // formValues[0] ? formValues[1] : 
                                // formValues[1] ? + formValues[0] : 
                                // formValues[2] ? ["1", "true"].includes(formValues[2]) :
                                // formValues[3] ? {x: formValues[3].split(' ')[0], y: formValues[3].split(' ')[1], z: formValues[3].split(' ')[2]} : value
                            )
                        })
                    }
                })
            }
        }
    })
    itemComponentRegistry.registerCustomComponent("cosmos:debug_canister", {
        onUse({source:player, itemStack}) {
            const fluids = {
                water: "Water",
                oil: "Oil",
                fuel: "Fuel",
                o2: "Oxygen Gas",
                h2: "Hydrogen Gas",
                n2: "Nitrogen Gas",
                co2: "Carbon Dioxide",
                methane: "Methane Gas",
                liquid_o2: "Liquid Oxygen",
                liquid_n2: "Liquid Nitrogen",
                argon: "Argon Gas",
                helium: "Helium Gas",
                liquid_argon: "Liquid Argon",
            }
            const form = new ActionFormData()
            .title("Choose a Fluid")
            Object.values(fluids).forEach(fluid => form.button(fluid))
            form.show(player).then(({selection, canceled}) => {
                if (canceled) return
                itemStack.setLore([`§r§7Fluid:§3 ${Object.keys(fluids)[selection]}`])
                player.getComponent('equippable').setEquipment('Mainhand', itemStack)
            })
        }
    })
})