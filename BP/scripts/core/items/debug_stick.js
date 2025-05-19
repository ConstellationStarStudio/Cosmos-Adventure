import { BlockStates, world, MolangVariableMap } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import machines from "../../core/machines/AllMachineBlocks";
import { location_of_side } from "../../api/utils";

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
    make_paricle(block.dimension, location_of_side(block, machine.energy_output), {r:1})
    make_paricle(block.dimension, location_of_side(block, machine.energy_input), {g:1})
}

function make_paricle(dimension, location, color) {
    if (!location) return
    const {x, y, z} = location
    const rgba = {red: color.r ?? 0, green:  color.g ?? 0, blue: color.b ?? 0, alpha: color.a ?? 1}
    const paricle_color = new MolangVariableMap()
    paricle_color.setColorRGBA('variable.color', rgba)
    dimension.spawnParticle('cosmos:dust', {x: x + 0.5, y: y + 0.5, z: z + 0.5}, paricle_color)
}

world.beforeEvents.worldInitialize.subscribe(({itemComponentRegistry}) => {
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
})