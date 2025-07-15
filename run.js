const fs = require("node:fs")

const packs = {
    bp: ["BP/"],
    rp: ["RP/", "SKYPEDIA/resource_pack/"],
}
const names = {
   "BP/": "cosmos_bp/",
   "RP/": "cosmos_rp/",
   "SKYPEDIA/resource_pack/": "cosmos_skypedia/",
}

const scripts = {
    source: "BP/scripts/",
    target: "cosmos_bp/scripts/"
}

const ui = {
    source: "RP/ui/",
    target: "cosmos_rp/ui/",
    textures: "RP/textures/ui/",
    textures_target: "cosmos_rp/textures/ui/"
}

const bp = {
    source: "BP/",
    target: "cosmos_bp/"
}

const skypedia = {
    source: "SKYPEDIA/resource_pack/",
    target: "cosmos_skypedia/"
}

const mc = process.env.LOCALAPPDATA + "/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/"
const bp_path = mc + "development_behavior_packs/"
const rp_path = mc + "development_resource_packs/"

function copy_scripts() {
    fs.cpSync(
        scripts.source,
        bp_path + scripts.target,
        {recursive:true}
    )
    console.log('\u001b[32m' + "Copied Scripts" + "\u001B[37m")
}

function copy_ui() {
    fs.cpSync(
        ui.source,
        rp_path + ui.target,
        {recursive:true}
    )
    fs.cpSync(
        ui.textures,
        rp_path + ui.textures_target,
        {recursive:true}
    )
    console.log('\u001b[32m' + "Copied UI" + "\u001B[37m")
}

function copy_bp() {
    fs.cpSync(
        bp.source,
        bp_path + bp.target,
        {recursive:true}
    )
    console.log('\u001b[32m' + "Copied Behavior Pack" + "\u001B[37m")
}

function copy_skypedia() {
    fs.cpSync(
        skypedia.source,
        rp_path + skypedia.target,
        {recursive:true}
    )
    console.log('\u001b[32m' + "Copied Skypedia" + "\u001B[37m")
}

function copy() {
    ['bp', 'rp'].forEach(pack_type =>
        packs[pack_type].forEach(pack =>
            fs.cpSync(
                pack,
                eval(pack_type + '_path') + names[pack],
                {recursive:true}
            )
        )
    )
    console.log('\u001b[32m' + "Finished Copying" + "\u001B[37m")
}

function clean() {
    ['bp', 'rp'].forEach(pack_type => {
        const mc_path = eval(pack_type + '_path')
        packs[pack_type].forEach(pack =>
            clean_folder(mc_path + names[pack], pack)
        )
    })
    console.log('\u001b[32m' + "Finished Cleaning" + '\u001B[37m')
}

function clean_folder(folder, reference) {
    fs.readdirSync(folder).forEach(item => {
        if (!fs.existsSync(reference + item)) {
            fs.rmSync(folder + item, { recursive: true, force: true })
            console.log('\u001B[31m' + "Removed " + folder + item + '\u001B[37m')
        }
        else if (fs.lstatSync(reference + item).isDirectory()) clean_folder(folder + item + '/', reference + item + '/')
    })
}

function remove() {
    ['bp', 'rp'].forEach(pack_type =>
        packs[pack_type].forEach(pack =>
            fs.rmSync(eval(pack_type + '_path') + names[pack], { recursive: true, force: true })
        )
    )
}

if (process.argv[2] == 'reload') {
    if (process.argv[3] == 'all') {
        copy()
        clean()
    }
    if (process.argv[3] == 'scripts') {
        copy_scripts()
    }
    if (process.argv[3] == 'ui') {
        copy_ui()
    }
    if (process.argv[3] == 'bp') {
        copy_bp()
    }
    if (process.argv[3] == 'skypedia') {
        copy_skypedia()
    }
}

if (process.argv[2] == 'delete') remove()