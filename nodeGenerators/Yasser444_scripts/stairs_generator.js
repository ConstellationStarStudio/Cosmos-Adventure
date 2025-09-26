const fs = require('node:fs')

const { stairs } = require("./data.js")

function generate_stairs_block(block) {
    const id = block
    const file_name = block.replace('cosmos:', '')
    const texture = stairs[block].texture || file_name.replace('_stairs', '')
    const content = {
        format_version: "1.20.80",
        "minecraft:block": {
            description: {
                identifier:id,
                traits: { "minecraft:placement_direction": { enabled_states: ["minecraft:cardinal_direction"] }, "minecraft:placement_position": { enabled_states: ["minecraft:vertical_half"] } },
                states: { "generic:north_east": [true, false], "generic:north_west": [true, false], "generic:south_east": [false, true], "generic:south_west": [false, true] }
            },
            components: {
                "minecraft:geometry": {
                    identifier: "geometry.stairs",
                    bone_visibility: { top_ne: "q.block_state('minecraft:vertical_half') == 'top' || q.block_state('generic:north_east')", top_nw: "q.block_state('minecraft:vertical_half') == 'top' || q.block_state('generic:north_west')", top_se: "q.block_state('minecraft:vertical_half') == 'top' || q.block_state('generic:south_east')", top_sw: "q.block_state('minecraft:vertical_half') == 'top' || q.block_state('generic:south_west')", bottom_ne: "q.block_state('minecraft:vertical_half') == 'bottom' || q.block_state('generic:north_east')", bottom_nw: "q.block_state('minecraft:vertical_half') == 'bottom' || q.block_state('generic:north_west')", bottom_se: "q.block_state('minecraft:vertical_half') == 'bottom' || q.block_state('generic:south_east')", bottom_sw: "q.block_state('minecraft:vertical_half') == 'bottom' || q.block_state('generic:south_west')" }
                },
                "minecraft:destructible_by_mining": stairs[block].unbreakable ? false : { seconds_to_destroy: 0.5 },
                "minecraft:destructible_by_explosion": stairs[block].unbreakable ? false : { explosion_resistance: 12 },
                "minecraft:material_instances": {
                    "*": { texture: texture, render_method: "opaque" }
                },
                "minecraft:custom_components": ["cosmos:stairs"],
                "minecraft:tick": { "interval_range": [1,1] },
                "tag:stairs": {}
            }
        }
    }
    fs.writeFileSync(`../../BP/blocks/stairs/${file_name}.json`, JSON.stringify(content, null, 2), {flag: 'w'}) 
}

function generate_names(block) {
    const name = block.replace('cosmos:', '').replaceAll('_', ' ').replace(/\b\w/g, s => s.toUpperCase())
    const lines = fs.readFileSync(`../../RP/texts/en_US.lang`, { encoding: 'utf8', flag: 'r' }).split('\n')
    let exists = false
    content = []
    for (const [i, line] of lines.entries()) {
        if (line.includes(block)) { content.push(`tile.${block}.name=${name}\r`); exists = true}
        else content.push(line)
    } if (!exists) content.splice(content.indexOf('## stairs\r') + 1, 0, `tile.${block}.name=${name}\r`)
    fs.writeFileSync(`../../RP/texts/en_US.lang`, content.join('\n'), {flag: 'w'})
}

function generate_recipes(block) {
    const id = block
    const recipe_name = block.replace('cosmos:', '')
    const ingredient = stairs[block].ingredient || 'cosmos:' + (stairs[block].texture || recipe_name.replace('_stairs', ''))
    const content = {
        format_version: "1.20.10",
        "minecraft:recipe_shaped": {
            description: { identifier: id },
            tags: [ "crafting_table" ],
            pattern: [
                "#  ",
                "## ",
                "###"
            ],
            key: { "#": { item: ingredient } },
            unlock: [ { item: ingredient } ],
            result: { item: id, count: 4 }
        }
    }
    fs.writeFileSync(`../../BP/recipes/auto_made/${recipe_name}.json`, JSON.stringify(content, null, 2), {flag: 'w'}) 
}

function generate_stonecutter(block) {
    const id = block
    const recipe_name = block.replace('cosmos:', '')
    const ingredient = stairs[block].ingredient || 'cosmos:' + (stairs[block].texture || recipe_name.replace('_stairs', ''))
    const content = {
        format_version: "1.20.10",
        "minecraft:recipe_shapeless": {
            description: { identifier: 'cosmos:stonecutting_' + recipe_name },
            tags: [ "stonecutter" ],
            ingredients: [ { item: ingredient } ],
            unlock: [ { item: ingredient } ],
            result: { item: id }
        }
    }
    
    fs.writeFileSync(`../../BP/recipes/auto_made/stonecutting_${recipe_name}.json`, JSON.stringify(content, null, 2), {flag: 'w'}) 
}

Object.keys(stairs).forEach(block => {
    generate_stairs_block(block)
    generate_names(block)
    generate_recipes(block)
    generate_stonecutter(block)
})