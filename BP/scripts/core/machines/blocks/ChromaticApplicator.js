import { ItemStack } from "@minecraft/server";
import { machine_buttons, setup_ui_button } from "../MachineButtons";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils";

const DYE_COLORS = {
    "minecraft:white_dye": [249, 255, 254],
    "minecraft:orange_dye": [249, 128, 29],
    "minecraft:magenta_dye": [199, 78, 189],
    "minecraft:light_blue_dye": [58, 179, 218],
    "minecraft:yellow_dye": [254, 216, 61],
    "minecraft:lime_dye": [128, 199, 31],
    "minecraft:pink_dye": [243, 139, 170],
    "minecraft:gray_dye": [71, 79, 82],
    "minecraft:light_gray_dye": [157, 157, 151],
    "minecraft:cyan_dye": [22, 156, 156],
    "minecraft:purple_dye": [137, 50, 184],
    "minecraft:blue_dye": [60, 68, 170],
    "minecraft:brown_dye": [131, 84, 50],
    "minecraft:green_dye": [94, 124, 22],
    "minecraft:red_dye": [176, 46, 38],
    "minecraft:black_dye": [29, 29, 33],
    "minecraft:bone_meal": [249, 255, 254],
    "minecraft:ink_sac": [29, 29, 33],
    "minecraft:cocoa_beans": [131, 84, 50],
    "minecraft:lapis_lazuli": [60, 68, 170],
};

function get_color(item) {
    if (!item) return null;
    if (DYE_COLORS[item.typeId]) return DYE_COLORS[item.typeId];
    return [255, 255, 255]; // fallback
}

const ButtonApply = 3;
const ButtonMix = 4;
const ButtonReset = 5;


const data = {
    items: {
        top_input: [0],
        side_input: [1],
        output: [] 
    },
    onTick(entity, block) {
        const container = entity.getComponent('minecraft:inventory').container;
        
        let ui_initialized = entity.getDynamicProperty("ui_initialized");
        if (!ui_initialized) {
            entity.setDynamicProperty("ui_initialized", true);
            setup_ui_button(entity, ButtonApply, "Apply");
            setup_ui_button(entity, ButtonMix, "Mix");
            setup_ui_button(entity, ButtonReset, "Reset");
        } else {
            if (container.was_ui_clicked(ButtonApply, entity)) {
                
    const item = container.getItem(0);
    if (item) {
        const variables = load_dynamic_object(entity, "machine_data");
        const color = variables.color || [255, 255, 255];
        const intColor = (color[0] << 16) | (color[1] << 8) | color[2];
        item.setDynamicProperty("cosmos:color", intColor);
        
        const lore = item.getLore();
        const hex = `${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`.toUpperCase();
        const colorLore = `§r§7Color: #${hex}`;
        const newLore = lore.filter(l => !l.startsWith('§r§7Color:'));
        newLore.push(colorLore);
        item.setLore(newLore);
        container.setItem(0, item);
    }
                setup_ui_button(entity, ButtonApply, "Apply");
            }
            if (container.was_ui_clicked(ButtonMix, entity)) {
                
    const dye = container.getItem(1);
    if (dye) {
        const addedColor = get_color(dye);
        if (addedColor) {
            const variables = load_dynamic_object(entity, "machine_data");
            let currentColor = variables.color;
            if (!currentColor) {
                currentColor = addedColor;
            } else {
                currentColor = [
                    Math.floor((currentColor[0] + addedColor[0]) / 2),
                    Math.floor((currentColor[1] + addedColor[1]) / 2),
                    Math.floor((currentColor[2] + addedColor[2]) / 2),
                ];
            }
            variables.color = currentColor;
            save_dynamic_object(entity, variables, "machine_data");
            
            container.setItem(1, dye.decrementStack());
        }
    }
                setup_ui_button(entity, ButtonMix, "Mix");
            }
            if (container.was_ui_clicked(ButtonReset, entity)) {
                
    const variables = load_dynamic_object(entity, "machine_data");
    variables.color = [255, 255, 255];
    save_dynamic_object(entity, variables, "machine_data");
                setup_ui_button(entity, ButtonReset, "Reset");
            }
        }

        const variables = load_dynamic_object(entity, "machine_data");
        const color = variables.color || [255, 255, 255];
        
        const hex = `${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`.toUpperCase();
        container.add_ui_display(2, `§rCurrent Color:\n§7RGB: ${color[0]}, ${color[1]}, ${color[2]}\n§7Hex: #${hex}`, 0);
    }
};

export default data;
