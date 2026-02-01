import { ItemStack, system } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import recipes from "../../../recipes/circuit_fabricator.js"
import { compare_lists, load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";
import { get_data } from "../Machine.js";

const REQUIRED_MATERIALS = [
	"minecraft:diamond",
	"cosmos:raw_silicon",
	"cosmos:raw_silicon",
	"minecraft:redstone"
];

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;

        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy || 0;
        this.progress = vars.progress || 0;
        this.lastUiUpdate = 0;
    }

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

        const container = this.entity.getComponent('minecraft:inventory').container;
		const data = get_data(this.entity);
		const materials = [0, 1, 2, 3].map(i => container.getItem(i));
		const [raw_item, output_item] = [4, 6].map(i => container.getItem(i));
		const result = recipes.get(raw_item?.typeId);
		const has_space = !output_item || (result && output_item.typeId === result[0] && result[1] + output_item.amount <= output_item.maxAmount);
		const is_loaded = compare_lists(materials.map(i => i?.typeId), REQUIRED_MATERIALS);

        let stateChanged = false;

        // Energy input
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 5);
        }

        // Processing
		if (is_loaded && result && has_space && this.energy > 0 && this.progress < 150) {
            const gain = Math.min(150 - this.progress, dt);
			this.progress += gain;
            // Consumption: 20 gJ per tick
			this.energy = Math.max(0, this.energy - (20 * gain));
            stateChanged = true;
		} else if ((!has_space || this.energy === 0) && this.progress > 0) {
            this.progress = Math.max(0, this.progress - dt);
            stateChanged = true;
        }
		
		if (!is_loaded || !result) {
            if (this.progress > 0) {
                this.progress = 0;
                stateChanged = true;
            }
        }
		
		if (this.progress >= 150) {
			this.progress = 0;
			container.setItem(4, raw_item.decrementStack());
			for (let i = 0; i < 4; i++) {
				container.setItem(i, materials[i].decrementStack());
			}
			if (output_item?.typeId === result[0]) {
				output_item.amount += result[1];
				container.setItem(6, output_item);
			} else container.setItem(6, new ItemStack(result[0], result[1]));
			this.block.dimension.playSound("random.anvil_land", this.entity.location);
            stateChanged = true;
		}

        // UI and Persistence
		if (stateChanged || !container.getItem(7) || system.currentTick - this.lastUiUpdate > 20) {
            save_dynamic_object(this.entity, { energy: Math.floor(this.energy), progress: this.progress }, "machine_data");
			const energy_hover = `Energy Storage\n§aEnergy: ${Math.floor(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
			container.add_ui_display(7, energy_hover, Math.round((this.energy / data.energy.capacity) * 55));
			container.add_ui_display(8, `Progress: ${Math.round((this.progress / 150) * 100)}%`, Math.round((this.progress / 150) * 51));
			container.add_ui_display(9, `§r Status:\n${!this.energy ? '§4No Power' : this.progress > 0 ? '§2Running' : '   §6Idle'}`);
            this.lastUiUpdate = system.currentTick;
		}

        return this.progress > 0 || (is_loaded && result && has_space && this.energy > 0);
	}
}