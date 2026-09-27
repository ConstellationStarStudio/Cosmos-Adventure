import { MachineRegistry, gui, BARS, barHorizontal } from "../ui_datagen";

export function register(reg: MachineRegistry) {
	BARS.deconstructor = {
		defKey: "progress_bar",
		build: () => barHorizontal(
			[54, 17],
			"textures/ui/cosmos/machines/deconstructor_bar",
			"textures/ui/cosmos/machines/deconstructor_bar_fill",
			{
				icons: [{
					name: "deconstructor_on",
					texture: "textures/ui/cosmos/machines/deconstructor_on",
					size: [15, 13],
					offset: [24, -8], // x=77 -> 77-53=24, y=28 -> 28-36=-8
					condition: "(#data > 500 and not (#data = 1000))"
				}]
			}
		),
	};

	const m = reg.add(gui("deconstructor", "Deconstructor", 199));

	m.drawTitle();

	// Output slots (2-10): 3x3 grid starting at x=112, y=18
	m.slotGrid(112, 18, 3, 3, { name: "output_grid" });

	// Battery slot (0): x=55, y=75
	m.slot(55, 75, { name: "battery_slot", ghost: "power" });

	// Input slot (1): x=26, y=36
	m.slot(26, 36, { name: "input_slot" });

	// Energy bar: x=18, y=96, w=54, h=7
	m.drawEnergyBar(18, 96);

	// Progress bar: x=53, y=36, w=54, h=17
	m.drawProgressBar(53, 36, "deconstructor");

	// Small power icon at x=4, y=95, w=11, h=10
	m.drawImage("textures/ui/cosmos/slot_overlay/power", 4, 95, 11, 10, { name: "power_icon" });
}
