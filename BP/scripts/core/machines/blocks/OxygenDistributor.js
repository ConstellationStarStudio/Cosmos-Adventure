import { system} from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { input_fluid, load_from_canister } from "../../matter/fluids";

const CanisterSlot = 0, BatterySlot = 1
const OxygenDisplay = 2, EnergyDisplay = 3, StatusDisplay = 4
const ButtonSlot = 5

const data = {
    energy: {input: "right", capacity: 16000, maxInput: 25, rate: 10},
    o2: {input: "left", capacity: 6000, maxInput: 8},
    onTick(entity, block) {
        let distributor = entity;
        const visible_button = distributor.getDynamicProperty('visible_button')
        const container = distributor.getComponent('minecraft:inventory').container;
        const canister = container.getItem(CanisterSlot)

        const variables = load_dynamic_object(distributor, "machine_data");
        let energy = variables.energy || 0;
        let o2 = variables.o2 || 0;
        o2 = input_fluid({type: "o2", slot: "o2", liquid_type: "g"}, distributor, block, o2)[0]; // input from pipes or machines
        if (!(system.currentTick % 20) && canister) { // input from canister
            if (canister.typeId == "cosmos:o2_canister") o2 = load_from_canister({
                canister, amount: o2,
                capacity: data.o2.capacity,
                container, slot: CanisterSlot,
                ratio: 5 / 54,
                rate: data.o2.maxInput * 10 // multiplied by 10 because it runs every 20 ticks and the java version runs at half the speed
            })
            // handle creative canister
            if (canister.typeId == 'cosmos:creative_canister' && canister.getDynamicProperty('fluid') == 'o2') o2 = load_from_canister({
                creative: true,
                amount: o2, capacity: data.o2.capacity,
                ratio: 5 / 54,
                rate: data.o2.maxInput * 10
            })
        } 
        // Energy management
        energy = charge_from_machine(distributor, block, energy);
        energy = charge_from_battery(distributor, energy, BatterySlot);

        let bubble_radius = variables.bubble_radius || 0;

        if(bubble_radius > 0.5 && !distributor.hasTag("bubble_active")) distributor.addTag("bubble_active")
        else if(bubble_radius < 0.5){distributor.removeTag("bubble_active")};

        let active = (bubble_radius > 1 && energy > 0 && o2 > 30);
        if(!(system.currentTick % 2)) {
            if (energy > (data.energy.rate * 2) && o2 > 30){
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
        save_dynamic_object(distributor, {energy, o2, bubble_radius}, "machine_data");

        let status = (energy <= (data.energy.rate * 2))? "§4Not Enough Power":
        (o2 < 30)? "§4Not Enough Oxygen":
        "§2Active";

        
        const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
        const oxygen_hover = `Oxygen Storage\n§aOxygen: ${o2}/${data["o2"].capacity}`; 

        container.add_ui_display(OxygenDisplay, oxygen_hover, Math.round((o2 / data["o2"].capacity) * 55))
        container.add_ui_display(EnergyDisplay, energy_hover, Math.round((energy / data.energy.capacity) * 55))
        container.add_ui_display(StatusDisplay, '§rStatus: ' + status)
        if (!container.getItem(ButtonSlot)) {
            entity.setDynamicProperty('visible_button', !visible_button)
            container.add_ui_toggle(ButtonSlot, visible_button ? 0 : 1)
        }
    }
}; export default data