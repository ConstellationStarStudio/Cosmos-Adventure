import { system } from "@minecraft/server";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils";
import { charge_battery } from "../../matter/electricity";

const data = {
	energy: { output: "right", capacity: 16000, maxPower: 200 },
	items: {
		top_input: [],
		side_input: [],
	},
	onTick(entity, block) {
		const e = entity;
		let stopped = e.getDynamicProperty('stopped');
		if (stopped == undefined) stopped = false;
		const container = e.getComponent('minecraft:inventory').container;

		const variables = load_dynamic_object(e, "machine_data");
		let energy = variables.energy || 0;
		let power = variables.power || 0;

		let is_valid = false;
		let distance = 0;
		let block_below = block;
		for (let i = 1; i <= 20; i++) {
			try {
				block_below = block_below.below();
				if (!block_below) break;
				const type = block_below.typeId;
				if (type.includes("spout")) {
					is_valid = true;
					distance = i;
					break;
				}
			} catch (err) {
				break;
			}
		}

		let generated_energy = 0;
		if (is_valid && !stopped) {
			generated_energy = Math.floor(200 - ((distance - 1) / 19) * 170);
			energy = Math.min(energy + generated_energy, data.energy.capacity);
		}

		if (!stopped) {
			energy = charge_battery(e, energy, 0);
		}
		
		power = Math.min(energy, data.energy.maxPower);
		save_dynamic_object(e, { energy, power }, "machine_data");

		const energy_hover = `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
		const is_generating = `§r${generated_energy == 0 ? 'Generating: Not Generating' : 'Generating: ' + generated_energy + ' gJ/t'}`;
		let status = "§rStatus: " + (stopped ? '§6Disabled' : is_valid ? '§2Active' : '§4No Heat Source');

		container.add_ui_display(1, energy_hover, Math.round((energy / data.energy.capacity) * 55));
		container.add_ui_display(2, is_generating);
		container.add_ui_display(3, status);
		container.add_ui_button(4, stopped ? 'Enable' : 'Disable', entity, 'stopped', !stopped);
		// acid activity indicator (scales 0-16 based on generation)
		container.add_ui_display(5, "", is_valid ? Math.max(1, Math.round((generated_energy / 200) * 16)) : 0);
	}
};

export default data;
