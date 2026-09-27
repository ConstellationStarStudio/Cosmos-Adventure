import { MachineRegistry, gui } from "../ui_datagen";

// ── Methane Synthesizer ─────────────────────────────────────────
// Ported from: planets/mars/client/gui/GuiMethaneSynthesizer.java
//              planets/mars/inventory/ContainerMethaneSynthesizer.java
// ySize = 168

export function register(reg: MachineRegistry) {
	const m = reg.add(gui("methane_synthesizer", "Methane Synthesizer", 168));
	m.hideCloseButton();
	m.closeButton(-27, 12);
	m.drawTitle(47, 5);

	// Slots — positions straight from ContainerMethaneSynthesizer.addSlotToContainer()
	m.slot(7, 7, { name: "h2_input" });                              // 0: hydrogen canister
	m.slot(28, 7, { name: "co2_input" });                             // 1: CO₂ / atmospheric valve
	m.slot(53, 53, { name: "battery_slot", ghost: "power" });         // 2: battery
	m.slot(28, 53, { name: "carbon_slot" });                          // 3: carbon fragments
	m.slot(153, 7, { name: "methane_output" });                       // 4: methane output

	// Tanks — positions + heights from GuiElementInfoRegion
	m.drawFluidTank(7, 28, "hydrogen_gas", { name: "h2_tank" });                // height=38 (default)
	m.drawFluidTank(28, 28, "co2_gas", { name: "co2_tank", height: 20 });       // height=20
	m.drawFluidTank(153, 28, "methane", { name: "methane_tank" });               // height=38 (default)

	// HUD
	m.drawEnergyBar(66, 17);
	m.drawStatusText(72, 50);
	m.drawStatusText(75, 60, { name: "status_detail" });
	m.addButton(60, 28);
}
