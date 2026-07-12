import { system } from "@minecraft/server";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { input_fluid, load_from_canister } from "../../matter/fluids";
import { update_tank, tanks } from "../../../api/player/oxygen";

const CanisterSlot = 0, BatterySlot = 1,  TankSlot = 2
const EnergyDisplay = 3, OxygenDisplay = 4, StatusDisplay = 5

const data = {
    energy: {input: "right", capacity: 16000, maxInput: 37, rate: 15},
    o2: {input: "left", capacity: 1200, maxInput: 16},
    onTick(entity, block) {
        const container = entity.getComponent('minecraft:inventory').container
        let tank = container.getItem(TankSlot);
        const canister = container.getItem(CanisterSlot)
        const durability = tank?.getComponent("minecraft:durability");

        const variables = load_dynamic_object(entity, "machine_data");
        let energy = variables.energy || 0;
        let o2 = variables.o2 || 0;
        o2 = input_fluid({type: "o2", slot: "o2"}, entity, block, o2);

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
        energy = charge_from_machine(entity, block, energy);
        energy = charge_from_battery(entity, energy, BatterySlot);
        
        if(!(system.currentTick % 20)){
            energy = Math.max(energy - 5, 0);
            if(energy >= (data.energy.rate * 20) && tank && Object.keys(tanks).includes(tank.typeId) && durability.damage){
                let saved_durability = durability ? durability.maxDurability - durability.damage:
                0;
                tank = update_tank(tank, Math.min(saved_durability + Math.min(o2, 40), durability.maxDurability));
                if(container.getItem(TankSlot)) container.setItem(TankSlot, tank);
                o2 = Math.max(0, o2 - 40)
                energy = Math.max(0, energy - (data.energy.rate * 20));
            }
        }
        save_dynamic_object(entity, {energy, o2}, "machine_data");
        
        let status = (energy <= (data.energy.rate * 20))? "§4Not Enough Power":
        (!tank || !Object.keys(tanks).includes(tank.typeId))? "§4No Valid Oxygen Tank":
        (!durability.damage)? "§4Oxygen Tank Full":
        (o2 == 0)? "§4Not Enough Oxygen":
        "§2Active";
        
        const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
        const oxygen_hover = `Oxygen Storage\n§aOxygen: ${o2}/${data["o2"].capacity}`; 

        container.add_ui_display(EnergyDisplay, energy_hover, Math.round((energy / data.energy.capacity) * 55))
        container.add_ui_display(OxygenDisplay, oxygen_hover, Math.round((o2 / data["o2"].capacity) * 55))
        container.add_ui_display(StatusDisplay, '§rStatus: ' + status)
    }
}; export default data