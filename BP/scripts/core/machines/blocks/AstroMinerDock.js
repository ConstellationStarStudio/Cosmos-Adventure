import { system } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { compare_lists, load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";
import { setup_ui_button } from "../MachineButtons.js";

// Slot layout (from ui_datagen):
//   [0..71] = dock_slots (12×6 mined items grid)
//   [72]    = battery_slot
//   [73]    = energy_bar (UI display)
//   [74]    = recall_button (UI display)
const BatterySlot = 72;
const EnergyBarSlot = 73;
const ButtonSlot = 74;

const data = {
	energy: { input: "right", capacity: 16000, maxInput: 120 },
	items: {
		top_input: Array.from({ length: 72 }, (_, i) => i),
		side_input: Array.from({ length: 72 }, (_, i) => i)
	},
	onTick(entity, block) {
		const container = entity.getComponent('minecraft:inventory').container;
		const variables = load_dynamic_object(entity, "machine_data");
		let energy = variables.energy ?? 0;
		let isMining = variables.isMining ?? false;
		let first_values = [energy, isMining];

		// Charge from wires and battery
		energy = charge_from_machine(entity, block, energy);
		energy = charge_from_battery(entity, energy, BatterySlot);

		// Slow discharge when idle (1 gJ every 80 ticks)
		if (!(system.currentTick % 80)) energy -= Math.min(1, energy);

		// Only update UI if values changed (dirty-check optimization)
		if (!compare_lists(first_values, [energy, isMining]) || !container.getItem(EnergyBarSlot)) {
			save_dynamic_object(entity, { energy, isMining }, "machine_data");

			// Energy bar display
			const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
			container.add_ui_display(EnergyBarSlot, energy_hover, Math.round((energy / data.energy.capacity) * 66));
		}

		// Recall button
		if (container.was_ui_clicked(ButtonSlot, entity)) {
			const vars = load_dynamic_object(entity, "machine_data");
			vars.isMining = false;
			save_dynamic_object(entity, vars, "machine_data");
			setup_ui_button(entity, ButtonSlot, "Recall Miner");
		}
	},
	onPlace(entity) {
		setup_ui_button(entity, ButtonSlot, "Recall Miner");
	}
};

export default data;
