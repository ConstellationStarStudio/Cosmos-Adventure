import { system} from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { input_fluid, load_from_canister_gradual } from "../../matter/fluids";

export default class {
    constructor(entity, block) {
        this.entity = entity;
		this.block = block;
        if (entity.isValid) this.distribute_oxygen()
    }

    onPlace(){}
    distribute_oxygen() {
        let distributor = this.entity;
        const visible_button = distributor.getDynamicProperty('visible_button')
        const container = distributor.getComponent('minecraft:inventory').container;
		const data = get_data(distributor);

        const variables = load_dynamic_object(distributor);
        let energy = variables.energy || 0;
        let o2 = variables.o2 || 0;
        o2 = input_fluid("o2", distributor, this.block, o2);
        if(!(system.currentTick % 10)) o2 = load_from_canister_gradual(o2, "o2", distributor, 0);
        // Energy management
        energy = charge_from_machine(distributor, this.block, energy);
        energy = charge_from_battery(distributor, energy, 1);

        let bubble_radius = distributor.getDynamicProperty("bubble_radius") ?? 0;

        if(bubble_radius > 0.5 && !distributor.hasTag("bubble_active")) distributor.addTag("bubble_active")
        else if(bubble_radius < 0.5){distributor.removeTag("bubble_active")};

        let active = (bubble_radius > 1 && energy > 0 && o2 > 30);
        if(!(system.currentTick % 2)) {
            if (energy > 0 && o2 > 30){
                o2 = Math.max(o2 - 3, 0);
                energy = Math.max(energy - 3, 0);
                bubble_radius += 0.02;
            } else{
                bubble_radius -= 0.2;
            }
        }

        bubble_radius = Math.min(Math.max(bubble_radius, 0), 10) ;
        if(system.currentTick % (active ? 20 : 4) == 0){
            //do block thing  //yasser444: what thing?
        }

        if(!(system.currentTick % 20)){
            distributor.addEffect("invisibility", 9999, {showParticles: false});
            energy = Math.max(energy - 5, 0);
        }

        distributor.setProperty("cosmos:bubble_radius", visible_button ? bubble_radius : 0)
        distributor.setDynamicProperty("bubble_radius", bubble_radius)
        save_dynamic_object(distributor, {energy, o2});

        let status = (!energy)? "§4Not Enough Power":
        (o2 < 30)? "§4Not Enough Oxygen":
        "§2Active";

        
        const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
        const oxygen_hover = `Oxygen Storage\n§aOxygen: ${o2}/${data["o2"].capacity}`; 

        container.add_ui_display(2, oxygen_hover, Math.round((o2 / data["o2"].capacity) * 55))
        container.add_ui_display(3, energy_hover, Math.round((energy / data.energy.capacity) * 55))
        container.add_ui_display(4, '§rStatus: ' + status)
        if (!container.getItem(5)) {
            this.entity.setDynamicProperty('visible_button', !visible_button)
            container.add_ui_toggle(5, visible_button ? 0 : 1)
        }
    }
}