import { ItemStack, system, world } from "@minecraft/server";
import { space_gear_component } from "./player/space_gear";
import { end_cleaner_component } from "./world/PlanetBuilder";
import { aluminum_wire_component, switchable_wire_component} from "../core/blocks/aluminum_wire";
import { cavernous_vines_component } from "../core/blocks/cavernous_vines";
import { communication_dish_component } from "../core/blocks/dishbase";
import { cryogenic_chamber_component } from "../core/blocks/cryogenic_chamber";
import { walkway_component } from "../core/blocks/walkway";
import { arc_lamp, cheese_block, fallen_meteor } from "../core/matter/blocks";
import { fluid_pipe_component } from "../core/blocks/fluid_pipe";
import { fluid_tank_component } from "../core/blocks/fluid_tank";
import { hydraulic_platform_component } from "../core/blocks/hydraulic_platform";
import { components as launch_pad_components } from "../core/blocks/launch_pads";
import { nasa_workbench_component } from "../core/blocks/nasa_workbench";
import { treasure_chest_component } from "../core/blocks/treasure_chest";
import { wall_component } from "../core/blocks/wall";
import { evolved_skeleton_component } from "../core/entities/evolved_skeleton_boss";
import { debug_item_components } from "../core/items/debug_items";
import { desh_pickaxe_component } from "../core/items/desh_pickaxe";
import { grapple_component } from "../core/items/grapple";
import { wrench_component } from "../core/items/wrench";
import { bucket_component } from "../core/matter/fluids";
import { solar_panel_component } from "../core/machines/blocks/SolarPanel";
import { machine_component } from "../core/machines/Machine";
import { select_solar_system } from "./player/celestial_selector";
import { volcanic_pickaxe_component } from "../core/items/volcanic_pickaxe";
import nasa_workbench_recipes from "../recipes/nasa_workbench";

system.beforeEvents.startup.subscribe(({customCommandRegistry, itemComponentRegistry, blockComponentRegistry, dimensionRegistry}) => {
    const register_block_component = blockComponentRegistry.registerCustomComponent.bind(blockComponentRegistry)
    const register_item_component = itemComponentRegistry.registerCustomComponent.bind(itemComponentRegistry)
    const register_command = customCommandRegistry.registerCommand.bind(customCommandRegistry)
    const register_enum = customCommandRegistry.registerEnum.bind(customCommandRegistry)
    const register_dimension = dimensionRegistry.registerCustomDimension.bind(dimensionRegistry)

    // Block Components
    register_block_component('cosmos:end_cleaner', end_cleaner_component)
    register_block_component('cosmos:aluminum_wire', aluminum_wire_component)
    register_block_component('cosmos:switchable_wire', switchable_wire_component)
    register_block_component('cosmos:arc_lamp', arc_lamp)
    register_block_component("cosmos:cavernous_vines", cavernous_vines_component)
    register_block_component("cosmos:cheese_block", cheese_block)
    register_block_component("cosmos:communication_dish", communication_dish_component)
    register_block_component('cosmos:fallen_meteor', fallen_meteor)
    register_block_component('cosmos:fluid_pipe', fluid_pipe_component)
    register_block_component('cosmos:fluid_tank', fluid_tank_component)
    register_block_component("cosmos:hydraulic_platform", hydraulic_platform_component)
	register_block_component('cosmos:rocket_launch_pad', launch_pad_components.rocket_launch_pad)
	register_block_component('cosmos:buggy_fueling_pad', launch_pad_components.buggy_fueling_pad)
    register_block_component("cosmos:nasa_workbench", nasa_workbench_component)
    register_block_component('cosmos:cryogenic_chamber', cryogenic_chamber_component)
    register_block_component('cosmos:walkway', walkway_component)
    // register_block_component('cosmos:wall', wall_component)
    register_block_component('cosmos:treasure_chest', treasure_chest_component)
    register_block_component("cosmos:boss_block", evolved_skeleton_component)
    register_block_component('cosmos:solar_panel', solar_panel_component)
    register_block_component('cosmos:machine', machine_component)
    
    // Item Components
    register_item_component("cosmos:space_gear", space_gear_component)
    register_item_component("cosmos:rocket", launch_pad_components.rocket_item)
    register_item_component("cosmos:buggy", launch_pad_components.buggy_item)
    register_item_component("cosmos:debug_stick", debug_item_components.debug_stick)
    register_item_component("cosmos:property_rod", debug_item_components.property_rod)
    register_item_component("cosmos:dynamic_wand", debug_item_components.dynamic_wand)
    register_item_component("cosmos:debug_canister", debug_item_components.creative_canister)
    register_item_component('cosmos:desh_pickaxe', desh_pickaxe_component)
    register_item_component("cosmos:grapple", grapple_component)
    register_item_component("cosmos:wrench", wrench_component)
    register_item_component("cosmos:bucket", bucket_component)
    register_item_component("cosmos:volcanic_pickaxe", volcanic_pickaxe_component)

    // Dimensions
    register_dimension("cosmos:space_stations")
    // Commands
    register_command({
        name: "cosmos:render_distance", 
        description: "Changes the Script Render Distance", 
        cheatsRequired: false, permissionLevel: 1,
        mandatoryParameters: [{ type: "Integer", name: "chunks" }]
    }, 
    ({sourceType, sourceEntity}, chunks) => {
        if(sourceType == "Entity" && sourceEntity.typeId == "minecraft:player") {
            world.setDynamicProperty("render_distance", chunks);
        }
    })

    register_command({
        name: "cosmos:celestial_selector",
        description: "Opens the Celestial Selector screen.",
        cheatsRequired: true, permissionLevel: 1
    }, 
    ({sourceType, sourceEntity}) => {
        if (sourceType == "Entity" && sourceEntity.typeId == "minecraft:player") {
            system.run(() => select_solar_system(sourceEntity, 3, true))
        }
    })

    register_enum('cosmos:vehicle', Object.keys(nasa_workbench_recipes))
    register_command({
        name: "cosmos:get_vehicle",
        description: "Gives a rocket or a vehicle with an inventory.",
        cheatsRequired: true, permissionLevel: 1,
        mandatoryParameters: [
            { type: "Enum", name: "cosmos:vehicle" }
        ],
        optionalParameters: [
            { type: "Integer", name: "storage tier" }
        ]
    }, 
	({sourceType, sourceEntity: player}, rocket_type, storage_size = 0) => {
		if (sourceType != "Entity" || player.typeId != "minecraft:player") return
        if (storage_size < 0 || storage_size > 3) { player.sendMessage('§cStorage Space must be 0-3'); return }
        if (rocket_type == "cosmos:cargo_rocket_item" && storage_size != 0) { player.sendMessage('§cCargo storage size must be 0'); return }
        storage_size *= 18
        const inventory = player.getComponent('inventory').container
        const rocket = new ItemStack(rocket_type)
        system.run(() => {
            if (storage_size > 0) {
                rocket.setLore([`§r§7Storage Space: ${storage_size}`])
                rocket.setDynamicProperty("inventory_size", storage_size)
            }
            inventory.addItem(rocket)
        })
	})
})