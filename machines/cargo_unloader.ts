import { MachineRegistry, gui } from "../ui_datagen";

export function register(reg: MachineRegistry) {
	const m = reg.add(gui("cargo_unloader", "Cargo Unloader", 201));

	// Title
	m.drawString("container.cargounloader.name", 60, 12, { name: "title_text" });

	// Inventory Text
	m.drawString("container.inventory", 8, 111, { name: "inventory_text" });

	// Status Text
	m.drawString("gui.message.status.name", 11, 67, { name: "status_label" });

	// Battery Slot (index 0)
	m.slot(10, 27, { name: "battery_slot", ghost: "power" });

	// 14 Cargo Slots (indices 1 to 14) in a 2x7 grid
	// Note: slotGrid takes (x, y, cols, rows). Step is 18 (default).
	m.slotGrid(38, 27, 7, 2, { name: "cargo_grid" });

	// Button
	m.addButton(87, 77, { name: "unload_items_button" });

	// Energy bar
	m.drawEnergyBar(108, 102);
}
