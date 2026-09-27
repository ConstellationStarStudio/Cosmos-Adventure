import { system, BlockVolume} from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";

const data = {
    energy: {input: "right", capacity: 16000, maxInput: 25},
    o2: {input: "left", capacity: 6000},
    onTick(entity, block) {
        const data = get_data(entity);
        const container = entity.getComponent('minecraft:inventory').container;
        const variables = load_dynamic_object(entity, "machine_data");

        let energy = variables.energy || 0;
        let o2 = variables.o2 || 0;
        let disabled = variables.disabled || false;
        
        // Energy management
        energy = charge_from_machine(entity, block, energy);
        energy = charge_from_battery(entity, energy, 0);
        energy = Math.max(0, energy - 10);
        
        // TODO:
        const oxygen_usage = 0;
        const status = energy == 0 ? "§4Not Enough Power" : disabled ? "§4Disabled" : "§2Sealed";
        const thermal_status = "§2Normal";

        save_dynamic_object(entity, {energy, o2, disabled}, "machine_data");

        const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
        const oxygen_hover = `Oxygen Storage\n§aOxygen: ${Math.round(o2)}/${data["o2"].capacity}`;
        

        
        container.add_ui_display(3, oxygen_hover, Math.round((o2 / data["o2"].capacity) * 55));
        container.add_ui_display(4, energy_hover, Math.round((energy / data.energy.capacity) * 55));
        container.add_ui_display(5, disabled ? 'Enable Seal' : 'Disable Seal');
        container.add_ui_display(6, '§rStatus: ' + status);
        container.add_ui_display(7, `§rOxygen Usage: ${oxygen_usage} / sec`);
        container.add_ui_display(8, '§rThermal Status: ' + thermal_status);
    }
};

export default data;
