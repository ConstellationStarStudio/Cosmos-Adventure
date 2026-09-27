import { MachineRegistry, gui } from "../ui_datagen";

export function register(reg: MachineRegistry) {
	const m = reg.add(gui("short_range_telepad", "Short Range Telepad", 209));

	m.drawTitle();

	// Battery slot (Real slot 0)
	m.slot(152, 105, { name: "battery_slot", ghost: "power" });

	// Buttons (UI slots 1, 2, 3)
	m.addButton(122, 16, { name: "enable_button", width: 48, height: 20, fontScale: 0.5 });
	m.addTextBox(66, 16, { name: "address_button", width: 48, height: 20, fontScale: 0.5 });
	m.addTextBox(122, 38, { name: "target_address_button", width: 48, height: 20, fontScale: 0.5 });

	// Energy Bar (UI slot 4)
	m.drawEnergyBar(99, 114);

	// Static Text (does not take slots)
	m.drawString("Address:", 7, 22);
	m.drawString("Dest Address:", 7, 44);

	// Status Text (UI slots 5, 6)
	m.drawStatusText(7, 66, { name: "status_receiving" });
	m.drawStatusText(7, 88, { name: "status_sending" });
}
