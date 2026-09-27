import { MachineRegistry, gui } from "../ui_datagen";

export function register(reg: MachineRegistry) {
	const m = reg.add(gui("terraformer", "Terraformer", 237));
	
	m.hideCloseButton();
	m.closeButton(150, 4);

	// REAL SLOTS (0 - 13)
	// Slot 0 (Water Bucket): x=25, y=19
	m.slot(25, 19, { name: "water_bucket" });
	
	// Slot 1 (Battery): x=25, y=39
	m.slot(25, 39, { name: "battery", ghost: "power" });
	
	// Slots 2,3,4,5 (Bonemeal): x=25, 43, 61, 79 and y=63
	m.slot(25, 63, { name: "bonemeal_0" });
	m.slot(43, 63, { name: "bonemeal_1" });
	m.slot(61, 63, { name: "bonemeal_2" });
	m.slot(79, 63, { name: "bonemeal_3" });

	// Slots 6,7,8,9 (Saplings): x=25, 43, 61, 79 and y=87
	m.slot(25, 87, { name: "sapling_0" });
	m.slot(43, 87, { name: "sapling_1" });
	m.slot(61, 87, { name: "sapling_2" });
	m.slot(79, 87, { name: "sapling_3" });

	// Slots 10,11,12,13 (Seeds): x=25, 43, 61, 79 and y=111
	m.slot(25, 111, { name: "seed_0" });
	m.slot(43, 111, { name: "seed_1" });
	m.slot(61, 111, { name: "seed_2" });
	m.slot(79, 111, { name: "seed_3" });

	// UI SLOTS (14+)
	// Index 14: Energy Bar
	m.drawEnergyBar(45, 48);

	// Index 15: Fluid Tank
	m.drawFluidTank(56, 18, "water", { name: "water_tank", width: 39, height: 26 });

	// Index 16: Toggle Trees
	m.addButton(98, 85, { name: "toggle_trees", width: 72, height: 20 });
	
	// Index 17: Toggle Grass
	m.addButton(98, 109, { name: "toggle_grass", width: 72, height: 20 });
	
	// Index 18: Toggle Bubble
	m.addCheckbox(85, 132, { name: "toggle_bubble" });
}
