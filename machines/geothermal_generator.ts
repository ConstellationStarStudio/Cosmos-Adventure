import { MachineRegistry, gui } from "../ui_datagen";

export function register(reg: MachineRegistry) {
	const m = reg.add(gui("geothermal_generator", "Geothermal Generator", 201));

	// Title
	m.drawTitle();

	// Battery Slot (index 0)
	m.slot(152, 83, { name: "battery_slot", ghost: "power" });

	// Energy Bar (index 1) — Java: x=97, y=25, w=54, h=7
	m.drawEnergyBar(97, 25);

	// Generating text (index 2) — Java: centered at y=46
	m.drawStatusText(0, 46, { name: "generating_label", anchor: "top_middle", scale: 0.8 });

	// Status text (index 3) — Java: centered at y=57
	m.drawStatusText(0, 57, { name: "status_label", anchor: "top_middle", scale: 0.8 });

	// Enable/Disable button (index 4) — Java: centered, w=72, h=20
	m.addButton(52, 81, { name: "enable_button", width: 72, height: 20 });

	// Generation indicator / lava animation (index 5) — Java: x=33, y=21, w=46, h=16
	m.drawFluidTank(33, 21, "lava", { height: 16, name: "lava_tank" });
}
