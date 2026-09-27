import { MachineRegistry, gui } from "../ui_datagen";

export function register(reg: MachineRegistry) {
	const m = reg.add(gui("water_electrolyzer", "Water Electrolyzer", 168));
	m.hideCloseButton();
	m.closeButton(-44, 12);
	m.drawTitle(30, 5);
	m.slot(6, 6, { name: "water_intake" });
	m.slot(30, 49, { name: "battery_slot", ghost: "power" });
	m.slot(131, 6, { name: "o2_output" });
	m.slot(152, 6, { name: "h2_output" });
	m.drawFluidTank(6, 27, "water");
	m.drawFluidTank(131, 27, "oxygen_gas", { name: "oxygen_tank" });
	m.drawFluidTank(152, 27, "hydrogen_gas", { name: "hydrogen_tank" });
	m.drawEnergyBar(41, 16);
	m.drawStatusText(56, 50);
	m.addButton(39, 28);
}
