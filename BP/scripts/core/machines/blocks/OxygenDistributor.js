import { system } from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { input_fluid, load_from_canister_gradual } from "../../matter/fluids";

export default class {
    constructor(entity, block) {
        this.entity = entity;
		this.block = block;
        
        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy || 0;
        this.o2 = vars.o2 || 0;
        this.bubble_radius = vars.bubble_radius || 0;
        
        this.lastUiUpdate = 0;
    }

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

        const distributor = this.entity;
        const visible_button = distributor.getDynamicProperty('visible_button') ?? true;
        const container = distributor.getComponent('minecraft:inventory').container;
		const data = get_data(distributor);

        let stateChanged = false;

        // 1. Fluid input
        for (let i = 0; i < dt; i++) {
            this.o2 = input_fluid("o2", distributor, this.block, this.o2);
            if (Math.random() < dt / 10) this.o2 = load_from_canister_gradual(this.o2, "o2", distributor, 0);
        }

        // 2. Energy management
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(distributor, this.block, this.energy);
            this.energy = charge_from_battery(distributor, this.energy, 1);
        }

        // 3. Distribution Logic
        if (this.bubble_radius > 0.5 && !distributor.hasTag("bubble_active")) distributor.addTag("bubble_active");
        else if (this.bubble_radius <= 0.5 && distributor.hasTag("bubble_active")) distributor.removeTag("bubble_active");

        if (this.energy > 0 && this.o2 > 30) {
            const iterations = dt / 2;
            this.o2 = Math.max(this.o2 - (3 * iterations), 0);
            this.energy = Math.max(this.energy - (3 * iterations), 0);
            this.bubble_radius += 0.02 * iterations;
            stateChanged = true;
        } else {
            this.bubble_radius -= 0.2 * (dt / 2);
            stateChanged = true;
        }

        this.bubble_radius = Math.min(Math.max(this.bubble_radius, 0), 10);

        // Periodic effects
        if (system.currentTick % 20 === 0) {
            distributor.addEffect("invisibility", 9999, { showParticles: false });
            this.energy = Math.max(this.energy - 5, 0);
            stateChanged = true;
        }

        distributor.setProperty("cosmos:bubble_radius", visible_button ? this.bubble_radius : 0);

        // 4. Status & UI
        let status = (!this.energy) ? "§4Not Enough Power" :
            (this.o2 < 30) ? "§4Not Enough Oxygen" :
            "§2Active";

        if (stateChanged || !container.getItem(2) || system.currentTick - this.lastUiUpdate > 20) {
            save_dynamic_object(distributor, { energy: Math.floor(this.energy), o2: Math.floor(this.o2), bubble_radius: this.bubble_radius }, "machine_data");
            const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
            const oxygen_hover = `Oxygen Storage\n§aOxygen: ${Math.floor(this.o2)}/${data["o2"].capacity}`;

            container.add_ui_display(2, oxygen_hover, Math.round((this.o2 / data["o2"].capacity) * 55));
            container.add_ui_display(3, energy_hover, Math.round((this.energy / data.energy.capacity) * 55));
            container.add_ui_display(4, '§rStatus: ' + status);
            this.lastUiUpdate = system.currentTick;
        }

        if (!container.getItem(5)) {
            this.entity.setDynamicProperty('visible_button', !visible_button);
            container.add_ui_toggle(5, !visible_button ? 0 : 1);
        }

        return (this.energy > 0 && this.o2 > 30) || this.bubble_radius > 0;
    }
}
