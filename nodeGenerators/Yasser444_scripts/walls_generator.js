const fs = require('node:fs')

const { walls } = require("./data.js")

function generate_wall_block(block) {
    const id = block
    const file_name = block.replace('cosmos:', '')
    const texture = stairs[block].texture || file_name.replace('_stairs', '')
    const content = {
        format_version: "1.20.80",
        "minecraft:block": {
            description: {
                identifier:id,
                states: { "generic:north_wall": [true, false], "generic:east_wall": [true, false], "generic:south_wall": [false, true], "generic:west_wall": [false, true] }
            },
            components: {
                "minecraft:geometry": {
                    identifier: "geometry.wall",
                    bone_visibility: { 
                      north: "q.block_state('generic:north_wall')",
                      east: "q.block_state('generic:east_wall')",
                      south: "q.block_state('generic:south_wall')",
                      west: "q.block_state('generic:west_wall')",
                    }
                },
                "minecraft:destructible_by_mining": walls[block].unbreakable ? false : { seconds_to_destroy: 0.5 },
                "minecraft:destructible_by_explosion": walls[block].unbreakable ? false : { explosion_resistance: 12 },
                "minecraft:material_instances": {
                    "*": { texture: texture, render_method: "opaque" }
                },
                "minecraft:custom_components": ["cosmos:wall"],
                "minecraft:tick": { "interval_range": [1,1] },
                "tag:wall": {}
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
    } if (!exists) content.splice(content.indexOf('## walls\r') + 1, 0, `tile.${block}.name=${name}\r`)
    fs.writeFileSync(`../../RP/texts/en_US.lang`, content.join('\n'), {flag: 'w'})
}

function generate_recipes(block) {
    const id = block
    const recipe_name = block.replace('cosmos:', '')
    const ingredient = walls[block].ingredient || 'cosmos:' + (walls[block].texture || recipe_name.replace('_wall', ''))
    const content = {
        format_version: "1.20.10",
        "minecraft:recipe_shaped": {
            description: { identifier: id },
            tags: [ "crafting_table" ],
            pattern: [
                "###",
                "###",
            ],
            key: { "#": { item: ingredient } },
            unlock: [ { item: ingredient } ],
            result: { item: id, count: 6 }
        }
    }
    fs.writeFileSync(`../../BP/recipes/auto_made/${recipe_name}.json`, JSON.stringify(content, null, 2), {flag: 'w'}) 
}

function generate_stonecutter(block) {
    const id = block
    const recipe_name = block.replace('cosmos:', '')
    const ingredient = walls[block].ingredient || 'cosmos:' + (walls[block].texture || recipe_name.replace('_wall', ''))
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

Object.keys(walls).forEach(block => {
    generate_wall_block(block)
    generate_names(block)
    generate_recipes(block)
    generate_stonecutter(block)
})