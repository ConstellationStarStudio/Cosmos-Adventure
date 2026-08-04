const fs = require("node:fs")

const mc_path = `${process.env.APPDATA}/Minecraft Bedrock/Users/Shared/games/com.mojang`
const behavior_packs = `${mc_path}/development_behavior_packs`
const resource_packs = `${mc_path}/development_resource_packs`

const log_green = (message) => console.log(`\u001b[32m${message}\u001B[37m`)
const log_red = (message) => console.log(`\u001b[31m${message}\u001B[37m`)

function copy_folders(folders, success_message) {
    folders.forEach(([source, location, target]) => fs.cpSync(source, `${location}/${target}/`, {recursive:true}))
    log_green(success_message)
}

function clean_folders(folders, success_message) {
    folders.forEach(([source, location, target]) => clean_folder(`${location}/${target}/`, source))
    log_green(success_message)
}

function clean_folder(target, source, home = target) {
    fs.readdirSync(target).forEach(item => {
        const target_file = target + item, source_file = source + item
        if (!fs.existsSync(source_file)) {
            fs.rmSync(target_file, { recursive: true, force: true })
            log_red(`Removed ${target_file.replace(home, '')}`)
        }
        else if (fs.lstatSync(source_file).isDirectory()) clean_folder(`${target_file}/`, `${source_file}/`, home)
    })
}

switch (process.argv[2]) {
    case 'reload': switch (process.argv[3]) {
        case 'all': case undefined: {
            const folders = [
                ["BP/", behavior_packs, "cosmos_bp"],
                ["RP/", resource_packs, "cosmos_rp"],
            ]
            copy_folders(folders, "Finished Copying")
            clean_folders(folders, "Finished Cleaning")
        } break

        case 'ui': copy_folders([
            ["RP/ui/", resource_packs, "cosmos_rp/ui"],
            ["RP/textures/ui/", resource_packs, "cosmos_rp/textures/ui"]
        ], "Copied UI"); break
        
        case 'bp': copy_folders([["BP/", behavior_packs, "cosmos_bp"]], "Copied Behavior Pack"); break

        case 'scripts': copy_folders([["BP/scripts/", behavior_packs, "cosmos_bp/scripts"]], "Copied Scripts"); break
    } break

    case 'remove': case 'delete': {
        fs.rmSync(`${behavior_packs}/cosmos_bp`, { recursive: true, force: true })
        fs.rmSync(`${resource_packs}/cosmos_rp`, { recursive: true, force: true })
    } break
}
