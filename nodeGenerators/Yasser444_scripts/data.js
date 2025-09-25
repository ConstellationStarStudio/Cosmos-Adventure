const keys = {
    II: "minecraft:iron_ingot",
    CI: "minecraft:copper_ingot",
    GI: "minecraft:gold_ingot",
    AI: "cosmos:aluminum_ingot",
    TI: "cosmos:tin_ingot",

    HDP: "cosmos:heavy_duty_plate",
    CoS: "cosmos:compressed_steel",
    CoT: "cosmos:compressed_tin",
    CoI: "cosmos:compressed_iron",
    CoM: "cosmos:compressed_meteoric_iron",
    CoA: "cosmos:compressed_aluminum",
    CoB: "cosmos:compressed_bronze",

    ST: "minecraft:stick",
    RD: "minecraft:redstone",
    CO: "minecraft:coal",
}

const stairs = {
    "cosmos:tin_decoration_stairs": {
        texture: "tin_decoration_block",
    },
    "cosmos:detailed_tin_decoration_stairs": {
        texture: "detailed_tin_decoration_block"
    },
    "cosmos:moon_rock_stairs": {},
    "cosmos:mars_cobblestone_stairs": {},
    "cosmos:moon_dungeon_bricks_stairs": {
        unbreakable: true
    },
    "cosmos:mars_dungeon_bricks_stairs": {
        unbreakable: true
    },
}
const walls = {
    "cosmos:tin_decoration_wall": {
        texture: "tin_decoration_block",
    },
    "cosmos:detailed_tin_decoration_wall": {
        texture: "detailed_tin_decoration_block"
    },
    "cosmos:moon_rock_wall": {},
    "cosmos:mars_cobblestone_wall": {},
    "cosmos:moon_dungeon_bricks_wall": {
        unbreakable: true
    },
    "cosmos:mars_dungeon_bricks_wall": {
        unbreakable: true
    },
}

//First property in key is the item used to unlock the recipe
//Key properties can use item ids or short names from the above object
//If name wasn't specified, the file name and the recipe id will use the resulting item id
const recipes = {
    "cosmos:nose_cone": {
        key: { H: "HDP", R: "minecraft:redstone_torch" },
        shape: [
            " R ",
            " H ",
            "H H"
        ]
    },
    "cosmos:rocket_fins": {
        key: { H: "HDP", S: "CoS" },
        shape: [
            " S ",
            "HSH",
            "H H"
        ]
    },
    "cosmos:rocket_engine": [
        {
            name: "rocket_engine_from_copper",
            key: {
                O: "cosmos:oxygen_vent", F: "minecraft:flint_and_steel", H: "HDP",
                B: "minecraft:stone_button",  C: "cosmos:copper_canister"
            },
            shape: [
                " FB",
                "HCH",
                "HOH"
            ]
        },
        {
            name: "rocket_engine_from_tin",
            key: {
                O: "cosmos:oxygen_vent", F: "minecraft:flint_and_steel", H: "HDP",
                B: "minecraft:stone_button",  C: "cosmos:tin_canister"
            },
            shape: [
                " FB",
                "HCH",
                "HOH"
            ]
        }
    ],
    "cosmos:copper_canister": {
        key: { I: "CI"},
        amount: 2,
        shape: [
            "I I",
            "I I",
            "III"
        ]
    },
    "cosmos:tin_canister": {
        key: { I: "TI"},
        amount: 2,
        shape: [
            "I I",
            "I I",
            "III"
        ]
    },
    "cosmos:oxygen_vent": {
        key: { S: "CoS", T: "CoT"},
        items: ['T', 'T', 'T', 'S']
    },
    "cosmos:coal_generator": {
        key: { W: "cosmos:aluminum_wire", I: "II", C: "CI", F: "minecraft:furnace"},
        shape: [
            "CCC",
            "IFI",
            "IWI"
        ]
    },
    "cosmos:compressor": {
        key: { W: "cosmos:basic_wafer", I: "AI", C: "CI", A: "minecraft:anvil"},
        shape: [
            "IAI",
            "ICI",
            "IWI"
        ]
    },
    "cosmos:circuit_fabricator": {
        key: { L: "minecraft:lever", A: "AI", F: "minecraft:furnace", B: "minecraft:stone_button", W: "cosmos:aluminum_wire", T: "minecraft:redstone_torch"},
        shape: [
            "ALA",
            "BFB",
            "WTW"
        ]
    },
    "cosmos:aluminum_wire": {
        name: "aluminum_wire",
        key: { A: "AI", W: "minecraft:wool"},
        amount: 6,
        shape: [
            "WWW",
            "AAA",
            "WWW"
        ]
    },
    "cosmos:energy_storage_module": {
        key: { B: "cosmos:battery", S: "CoS"},
        shape: [
            "SSS",
            "BBB",
            "SSS"
        ]
    },
    "cosmos:energy_storage_cluster": {
        key: { E: "cosmos:energy_storage_module", S: "CoS", W: "cosmos:advanced_wafer"},
        shape: [
            "ESE",
            "SWS",
            "ESE"
        ]
    },
    "cosmos:battery": {
        key: { T: "CoT", R: "RD", C: "CO"},
        shape: [
            " T ",
            "TRT",
            "TCT"
        ]
    },
    "cosmos:oxygen_collector": {
        key: { C: "cosmos:oxygen_concentrator", T: "cosmos:tin_canister", A: "CoA", S: "CoS", F: "cosmos:oxygen_fan", V: "cosmos:oxygen_vent"},
        shape: [
            "SSS",
            "FTV",
            "ACA"
        ]
    },
    "cosmos:rocket_launch_pad": {
        key: { C: "CoI", I: "minecraft:iron_block"},
        amount: 9,
        shape: [
            "CCC",
            "III"
        ]
    },
    "cosmos:nasa_workbench": [
        {
            name: "nasa_workbench",
            key: { A: "cosmos:advanced_wafer", C: "minecraft:crafting_table", S: "CoS", L: "minecraft:lever", R: "minecraft:redstone_torch"},
            shape: [
                "SCS",
                "LWL",
                "SRS"
            ]
        },/*
        {
            name: "uncompact_nasa_workbench",
            key: { W: "cosmos:compact_nasa_workbench"},
            shape: [ "W" ]
        }*/
    ],/*
    "cosmos:compact_nasa_workbench": {
        key: { W: "cosmos:nasa_workbench"},
        shape: [ "W" ]
    },*/
    /* not made yet
    "cosmos:buggy_fuling_pad": {
        key: { C: "CoS", I: "minecraft:iron_block"},
        amount: 9,
        shape: [
            "CCC",
            "III"
        ]
    },
    "cosmos:oxygen_distributor": {
        key: { F: "cosmos:oxygen_fan", V: "cosmos:oxygen_vent", S: "CoS", A: "CoA"},
        shape: [
            "SFS",
            "VAV",
            "SFS"
        ]
    },
    "cosmos:oxygen_compressor": {
        key: { C: "cosmos:oxygen_concentrator", A: "CoA", S: "CoS", B: "CoB"},
        shape: [
            "SAS",
            "ACA",
            "SBS"
        ]
    },
    "cosmos:oxygen_decompressor": {
        key: { C: "cosmos:oxygen_concentrator", F: "cosmos:oxygen_fan", A: "CoA", S: "CoS", R: "minecraft:redstone_torch"},
        shape: [
            "SFS",
            "ACA",
            "SRS"
        ]
    },
    "cosmos:oxygen_sealer": {
        key: { F: "cosmos:oxygen_fan", V: "cosmos:oxygen_vent", A: "CoA", S: "CoS"},
        shape: [
            "ASA",
            "VFV",
            "ASA"
        ]
    },
    "cosmos:oxygen_sealer": {
        key: { V: "cosmos:oxygen_vent", V: "cosmos:basic_wafer", R: "RD", A: "CoA", S: "CoS"},
        shape: [
            "SSS",
            "VWV",
            "RAR"
        ]
    },
    "cosmos:heavy_aluminum_wire": [
        {
            name: "heavy_aluminum_wire_up",
            key: { A: "AI", W: "minecraft:wool", C: "cosmos:aluminum_wire"},
            shape: [
                "A",
                "C",
                "W"
            ]
        },
        {
            name: "heavy_aluminum_wire_down",
            key: { A: "AI", W: "minecraft:wool", C: "cosmos:aluminum_wire"},
            shape: [
                "W",
                "C",
                "A"
            ]
        }
    ],
    "cosmos:switch_aluminum_wire": {
        key: { W: "cosmos:aluminum_wire", R: "minecraft:redstone_repeater"},
        items: ['W', 'R']
    },
    "cosmos:switch_heavy_aluminum_wire": {
        key: { W: "cosmos:heavy_aluminum_wire", R: "minecraft:redstone_repeater"},
        items: ['W', 'R']
    },
    "cosmos:fluid_pipe": {
        key: { G: "minecraft:glass_pane"},
        shape: [
            "GGG",
            "   ",
            "GGG"
        ]
    },
    "cosmos:sealable_aluminum_wire": {
        key: { T: "cosmos:tin_wall_block", W: "cosmos:aluminum_wire"},
        shape: [
            "TWT"
        ]
    },
    "cosmos:sealable_heavy_aluminum_wire": {
        key: { T: "cosmos:tin_wall_block", W: "cosmos:heavy_aluminum_wire"},
        shape: [
            "TWT"
        ]
    },
    "cosmos:sealable_fluid_pipe": {
        key: { T: "cosmos:tin_wall_block", P: "cosmos:fluid_pipe"},
        shape: [
            "TPT"
        ]
    },
    "cosmos:refinery": {
        key: { C: "cosmos:copper_canister", S: "CoS", F: "minecraft:furnace", B: "minecraft:stone"},
        shape: [
            " C ",
            "BCB",
            "SFS"
        ]
    },
    "cosmos:fuel_loader": {
        key: { W: "cosmos:basic_wafer", S: "CoT", C: "CoC", T: "cosmos:tin_canister"},
        shape: [
            "CCC",
            "CTC",
            "SWS"
        ]
    },
    "cosmos:cargo_loader": {
        key: { H: "minecraft:hopper", S: "CoS", A: "CoA", C: "minecraft:chest"},
        shape: [
            "SHS",
            "ACA",
            "SSS"
        ]
    },
    "cosmos:cargo_unloader": {
        key: { H: "minecraft:hopper", S: "CoS", A: "CoA", C: "minecraft:chest"},
        shape: [
            "SSS",
            "ACA",
            "SHS"
        ]
    },
    "cosmos:air_lock_frame": {
        key: { C: "cosmos:oxygen_concentrator", A: "CoA", S: "CoS"},
        amount: 4,
        shape: [
            "AAA",
            "SCS",
            "AAA"
        ]
    },
    "cosmos:air_lock_controller": {
        key: { W: "cosmos:basic_wafer", M: "CoM", S: "CoS"},
        shape: [
            "SSS",
            "MWM",
            "SSS"
        ]
    },
    "cosmos:basic_solar_panel": {
        key: { F: "cosmos:full_solar_panel", P: "cosmos:steel_pole", S: "CoS", W: "cosmos:basic_wafer", C: "cosmos:aluminum_wire" },
        shape: [
            "SFS",
            "SPS",
            "CWC"
        ]
    },
    "cosmos:advanced_solar_panel": {
        key: { F: "cosmos:full_solar_panel", P: "cosmos:steel_pole", S: "CoS", W: "cosmos:advanced_wafer", C: "cosmos:heavy_aluminum_wire" },
        shape: [
            "SFS",
            "SPS",
            "CWC"
        ]
    },

]   */
}
module.exports = {stairs, keys, recipes}