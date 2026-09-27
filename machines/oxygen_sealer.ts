import { MachineRegistry, gui } from "../ui_datagen";

export function register(reg: MachineRegistry) {
    const m = reg.add(gui("oxygen_sealer", "Oxygen Sealer", 200));

    // Slots
    m.slot(33, 27, { name: "battery_slot", ghost: "power" });
    m.slot(10, 27, { name: "oxygen_slot", ghost: "o2" });
    m.slot(56, 27, { name: "thermal_slot", ghost: "gear" }); // ambient thermal controller

    // UI Slots
    m.drawOxygenBar(113, 24); // ui index 3
    m.drawEnergyBar(113, 37); // ui index 4

    m.addButton(50, 91, { name: "disable_button" }); // ui index 5

    m.drawStatusText(0, 50, { anchor: "top_middle", name: "status_text" }); // ui index 6
    m.drawStatusText(0, 60, { anchor: "top_middle", name: "oxygen_usage_text" }); // ui index 7
    m.drawStatusText(0, 70, { anchor: "top_middle", name: "thermal_status_text" }); // ui index 8
    
    // Add "In:" static labels
    m.drawString("In:", 80, 26, { color: [0.25, 0.25, 0.25] });
    m.drawString("In:", 80, 38, { color: [0.25, 0.25, 0.25] });
}
