
const fs = require('node:fs')

const {id_to_name, read_json, get_folders, make_comments} = require('./scripts/utils.js')

const blocks = [
    'asteroids_aluminum_ore',
    'venus_copper_ore',
    'asteroids_iron_ore',
    'dense_ice',
    'galena_ore',
    'mars_copper_ore',
    'mars_fine_regolith',
    'mars_iron_ore',
    'mars_regolith',
    'mars_stone',
    'mars_tin_ore',
    'moon_copper_ore',
    'moon_sapphire_ore',
    'moon_tin_ore',
    'pumice',
    'scorched_venus_rock',
    'solar_ore',
    'venus_aluminum_ore',
    'venus_hard_rock',
    'venus_quartz_ore',
    'venus_silicon_ore',
    'venus_soft_rock',
    'venus_tin_ore',
    'venus_volcanic_rock',
    'vapor_spout',
]

const template = {
    "format_version": "1.20.80",
    "minecraft:block": {
      "description": {
        "identifier": ""
      },
      "components": {}
    }
  }

// blocks.forEach(block => {
//     template["minecraft:block"].description.identifier = "cosmos:" + block
//     fs.writeFileSync(`./blocks/${block}.json`, JSON.stringify(template, null, 2))
// })

// const shortnames = {}

// blocks.forEach(block => {
//     shortnames[block] = {
//         "sound": "stone",
//         "textures": block
//     }
// })
// console.log(JSON.stringify(shortnames, null, 2))

blocks.forEach(block => {
    console.log(`tile.cosmos:${block}.name=${id_to_name('c:'+block)}`)
})