import { gui } from "../ui_datagen";

export function register(reg: any) {
	const m = reg.add(gui("chromatic_applicator", "Chromatic Applicator", 186));

	m.drawTitle();

	// Container Slots
	m.slot(40, 25, { name: "to_be_painted" });
	m.slot(122, 25, { name: "dyes" });

	// Color Selector Box
	m.drawColorSelector(79, 24, { name: "color_selector" });

	// Buttons
	m.addButton(92, 45, { name: "apply_paint" });
	m.addButton(8, 45, { name: "mix_paint" });
	m.addButton(8, 67, { name: "reset_paint" });
}
