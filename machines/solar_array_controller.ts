import { MachineRegistry, gui } from "../ui_datagen";

export function register(reg: MachineRegistry) {
	const m = reg.add(gui("solar_array_controller", "Solar Array Controller", 209));

	// Label "Solar Array Controller": x=88, y=7, centered
	m.drawTitle(0, 7, { anchor: "top_middle" });

	// Slot index 0: x=152, y=91
	m.slot(152, 91, { name: "battery_slot", ghost: "power" });

	// Label "Generating: ": x=0 (centered), y=46
	m.drawStatusText(0, 46, { name: "generating", anchor: "top_middle" });

	// Label "Status: ": x=0 (centered), y=57
	m.drawStatusText(0, 57, { name: "status", anchor: "top_middle" });

	// Label "Environment: ": x=0 (centered), y=68
	m.drawStatusText(0, 68, { name: "environment", anchor: "top_middle" });

	// Label "Connected Panels: ": x=0 (centered), y=79
	m.drawStatusText(0, 79, { name: "connected_panels", anchor: "top_middle" });


	// Button id 0: x=52, y=93, w=72, h=20
	m.addButton(52, 93, { name: "enable_button" });
}
