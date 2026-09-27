import { MachineRegistry, gui } from "../ui_datagen";

export function register(reg: MachineRegistry) {
	const m = reg.add(gui("cargo_loader", "Cargo Loader", 201));

	// Title
	m.drawTitle();

	// Battery Slot: index 0, x=10, y=27
	m.slot(10, 27, { name: "battery_slot", ghost: "power" });

	// Inventory Grid: 14 slots (indices 1 to 14) as a 7x2 grid starting at x=38, y=27
	m.slotGrid(38, 27, 7, 2, { name: "cargo_grid" });

	// Energy Bar: at x=108, y=102, width=54, height=7
	m.drawEnergyBar(108, 102);

	// Background lightning symbol: x=94, y=101, w=11, h=10
	m.drawImage("textures/ui/cosmos/slot_overlay/power", 94, 101, 11, 10, { name: "lightning_icon" });

	// Button: "Load Items" at x=87, y=77, width=76, height=20
	m.addButton(87, 77, { name: "load_items_button" });
}
