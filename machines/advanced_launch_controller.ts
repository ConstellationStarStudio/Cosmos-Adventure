import { MachineRegistry, gui } from "../ui_datagen";

export function register(reg: MachineRegistry) {
	const m = reg.add(gui("advanced_launch_controller", "Advanced Launch Controller", 209));
	m.hideCloseButton();
	m.drawTitle();

	m.slot(152, 105, { name: "battery_slot", ghost: "power" });
	m.drawEnergyBar(99, 114);

	m.addCheckbox(27, 20, { name: "remove_pad_checkbox" });
	m.addCheckbox(27, 38, { name: "launch_when_checkbox" });
	m.addButton(52, 52, { name: "launch_condition_dropdown" });
	m.addButton(5, 5, { name: "back_button", width: 20, height: 20 });
}
