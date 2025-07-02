import { world, ItemStack, system } from "@minecraft/server"
import recipes  from "../../recipes/nasa_workbench"

const schematics = {
    'cosmos:schematic_rocket_t2': 'cosmos:rocket_tier_2_item',
    'cosmos:schematic_rocket_t3': 'cosmos:rocket_tier_3_item',
    'cosmos:schematic_buggy': 'cosmos:moon_buggy_item',
    'cosmos:schematic_cargo_rocket': 'cosmos:cargo_rocket_item',
    'cosmos:schematic_astro_miner': 'cosmos:astro_miner_item',
}

const MAXSIZE = 18
const BUTTONS = MAXSIZE + 5
const SCHEMA = BUTTONS + 6
const SCHEMAS = SCHEMA + 2

function select_recipe(recipe, workbench, player) {
    workbench.setDynamicProperty('recipe', recipe)
    const inventory = workbench.getComponent("minecraft:inventory").container
    for (let i = 0; i < MAXSIZE + 3; i++) {
        const item = inventory.getItem(i)
        if (player && item && item.typeId != 'cosmos:ui') workbench.dimension.spawnItem(item, player.location)
        inventory.setItem(i, i < recipes[recipe].length || i >= MAXSIZE ? undefined : new ItemStack('cosmos:ui'))
    }
}
function block_all_slots(workbench, player) {
    const inventory = workbench.getComponent("minecraft:inventory").container
    for (let i = 0; i < MAXSIZE + 3; i++) {
        const item = inventory.getItem(i)
        if (player && item && item.typeId != 'cosmos:ui') workbench.dimension.spawnItem(item, player.location)
        inventory.setItem(i, new ItemStack('cosmos:ui'))
    }
}

function tick(workbench) {
    // retrive data
    const inventory = workbench.getComponent("minecraft:inventory").container
    const selected_recipe = workbench.getDynamicProperty('recipe')
    const nearest_player = workbench.dimension.getPlayers({closest: 1, location: workbench.location})[0]
    const recipe = recipes[selected_recipe]
    // read the inputs
    const inputs = []
    for (let i = 0; i<MAXSIZE; i++) {
        inputs.push(inventory.getItem(i)?.typeId)
    }
    // check the recipe
    let recipe_matches = true
    for (let i in recipe) {
        if (recipe[i] != inputs[i]) {
            recipe_matches = false
            break
        }
    }
    // set the storage size
    let storage_size = 0
    const storage_type = selected_recipe == 'cosmos:moon_buggy_item' ? 'cosmos:buggy_storage' : 'minecraft:chest'
    if (selected_recipe != 'cosmos:astro_miner_item') {
        for (let i = 0; i<3; i++) {
            if (inventory.getItem(MAXSIZE + i)?.typeId == storage_type) storage_size += 18
        }
    }

    // detect craft button press
    const craft_button = inventory.getItem(MAXSIZE + 4)
    if (!craft_button) {
        // reset the button
        inventory.add_ui_button(MAXSIZE + 4)
        // consume the crafting materials
        for (let i = 0; i < recipe.length; i++) {
            inventory.setItem(i, inventory.getItem(i)?.decrementStack())
        }
        // consume the added storage
        for (let i = 0; i < 3; i++) {
            const item = inventory.getItem(MAXSIZE + i)
            if (!item || item.typeId != storage_type) continue
            inventory.setItem(MAXSIZE + i, item?.decrementStack())
        }
        // find the player who crafted
        workbench.dimension.getPlayers({location: workbench.location, maxDistance: 20}).forEach(player => {
            const inventory = player.getComponent('inventory')
            // search for the button in his inventory
            for (let i = 0; i < inventory.inventorySize; i++) {
                const item = inventory.container.getItem(i)
                if (!item || item.typeId != 'cosmos:ui_button') continue
                const id = item.getLore()[0]
                if (!id || id != workbench.id) continue
                const storage_space = parseInt(item.nameTag.replace('§craft_button:size', ''))
                const rocket_type = item.nameTag.replace('§craft_button:size' + storage_space, '')
                const rocket = new ItemStack(rocket_type)
                if (storage_space > 0){
                    rocket.setLore([`§r§7Storage Space: ${storage_space}`])
                    rocket.setDynamicProperty("inventory_size", storage_space)
                }
                inventory.container.setItem(i, rocket)
            } 
        })
    }

    // change the craft button depending on the inputs
    if (recipe_matches && !(selected_recipe == 'cosmos:cargo_rocket_item' && storage_size == 0)) {
        const button_name = `§craft_button:size${storage_size}${selected_recipe}`
        if (!craft_button || craft_button.nameTag != button_name) inventory.add_ui_button(MAXSIZE + 4, button_name, [workbench.id])
    } else {
        if (!craft_button || craft_button.nameTag) inventory.add_ui_button(MAXSIZE + 4)
    }

    // get the schematic
    const schematic = inventory.getItem(MAXSIZE + 3)

    // set up the side buttons based on the inserted schematics
    const unlocked_schematics = [true]
    const schematic_names = Object.keys(schematics)
    for (const i in schematic_names) {
        unlocked_schematics[+i + 1] = inventory.getItem(SCHEMAS + +i)?.typeId == schematic_names[i]
    }

    // add the side buttons
    const button_names = ['Tier 1 Rocket', 'Tier 2 Rocket', 'Tier 3 Rocket', 'Moon Buggy', 'Cargo Rocket', 'Astro Miner']
    for (let i in button_names) {
        const side_button = inventory.getItem(BUTTONS + +i)
        //detect a button press
        if (!side_button) {
            //reset the button
            workbench.runCommand('clear @a cosmos:ui_button')
            //return the items to the nearest player and change the selected recipe
            select_recipe(Object.keys(recipes)[i], workbench, nearest_player)
            inventory.add_ui_display(SCHEMAS + schematic_names.length, button_names[i], +i+1)
        }
        //set up the button
        const button_name = unlocked_schematics[i] ? `§side_button:${button_names[i]}` : ''
        if (inventory.getItem(BUTTONS + +i)?.nameTag != button_name) inventory.add_ui_button(BUTTONS + +i, button_name)
    }

    //the button that takes you to the schmatic insertion screen
    const schematic_button = inventory.getItem(SCHEMA)
    // if the button got pressed
    if (!schematic_button) {
        //reset the button
        workbench.runCommand('clear @a cosmos:ui_button')
        block_all_slots(workbench, nearest_player)
        inventory.add_ui_display(SCHEMAS + schematic_names.length, 'Add New Schematics', 7)
    }
    //reset the button
    const unlock_button_name = unlocked_schematics.includes(false) ? `§side_button:Add Schemas` : ''
    if (inventory.getItem(SCHEMA)?.nameTag != unlock_button_name) inventory.add_ui_button(SCHEMA, unlock_button_name)

    //detect pressing the unlock button
    const unlock_button = inventory.getItem(SCHEMA + 1)
    if (!unlock_button) {
        //reset the button
        workbench.runCommand('clear @a cosmos:ui_button')
        inventory.add_ui_button(SCHEMA + 1, 'Unlock')
        //get the placed schematic and make sure its new
        if (!schematic) return
        if (!schematic_names.includes(schematic.typeId)) return
        const schematic_place = schematic_names.indexOf(schematic.typeId)
        if (inventory.getItem(SCHEMAS + schematic_place)?.typeId == schematic.typeId) return
        //move the schematic to its permenant slot
        inventory.setItem(SCHEMAS + schematic_place, schematic)
        inventory.setItem(MAXSIZE + 3)
    }
}

system.afterEvents.scriptEventReceive.subscribe(({id, sourceEntity:workbench, message}) => {
    if (id != "cosmos:nasa_workbench") return
    if (message == "tick" ) {
        tick(workbench)
    }
    if (message == "despawn" ) {
        const inventory = workbench.getComponent("minecraft:inventory").container
        for (let i = 0; i < inventory.size; i++) {
            if (["cosmos:ui", "cosmos:ui_button"].includes(inventory.getItem(i)?.typeId)) inventory.setItem(i)
        }
        workbench.kill()
        workbench.remove()
    }
})

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("cosmos:nasa_workbench", {
        beforeOnPlayerPlace(event){
            system.run(() => {
                const {dimension, block} = event
                let space = true
                for (let i = -1; i<2; i++) {
                    if (block.offset({x: i, y: 1, z: 0}).typeId != "minecraft:air") space = false
                    if (block.offset({x: i, y: 2, z: 0}).typeId != "minecraft:air") space = false
                }
                for (let i = -1; i<2; i++) {
                    if (block.offset({x: 0, y: 1, z: i}).typeId != "minecraft:air") space = false
                    if (block.offset({x: 0, y: 2, z: i}).typeId != "minecraft:air") space = false
                }
                if (!space) { event.cancel = true; return }
                const entity = dimension.spawnEntity("cosmos:nasa_workbench", block.above().bottomCenter())
                entity.nameTag = "§n§a§s§a§_§w§o§r§k§b§e§n§c§h"
                select_recipe('cosmos:rocket_tier_1_item', entity)
                const inventory = entity.getComponent('inventory').container
                for (let i = SCHEMAS; i < SCHEMAS + 9; i++) inventory.add_ui_display(i)
                    for (let i = BUTTONS - 1; i < BUTTONS + 8; i++) inventory.add_ui_button(i)
                inventory.add_ui_button(SCHEMA + 1, 'Unlock')
                inventory.add_ui_display(SCHEMAS + 5, 'Tier 1 Rocket', 1)
            });
        },
        onPlayerBreak({block, dimension}){
            const entities = dimension.getEntities({
                type: "cosmos:nasa_workbench",
                location: block.above().center(),
                maxDistance: 0.5
            })
            entities?.forEach(entity => entity.runCommand(`scriptevent cosmos:nasa_workbench despawn`))
        }
    })
})