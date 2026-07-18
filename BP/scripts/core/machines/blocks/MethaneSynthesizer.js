import { system } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_machine, charge_from_battery } from "../../matter/electricity"
import { machine_buttons, setup_ui_button } from "../MachineButtons"
import { input_fluid, load_from_item, load_to_canister, output_fluid } from "../../matter/fluids"

const InputSlot = 0, BatterySlot = 1, Co2Input = 2, MethaneOutput = 3, CoalItem = 4
const HydrogenDisplay = 5, CO2Display = 6, MethaneDisplay = 7, EnergyDisplay = 8
const StatusDisplay = 9, ButtonSlot = 10
const ProcessButtonText = (state) => state ? 'Stop' : 'Process'

const data = {
	energy: {input: "below", capacity: 16000, maxInput: 112, rate: 45},
    co2: {capacity: 2000},
	h2: {input: "right", capacity: 4000},
	methane: {output: "left", capacity: 2000},
	onTick(entity, block) {
        const container = entity.getComponent('minecraft:inventory').container
        const active = entity.getDynamicProperty('active')
            
        const variables = load_dynamic_object(entity, "machine_data")

        let energy = variables.energy || 0
        let water = variables.water || 0
        let co2 = variables.co2 || 0
        let h2 = variables.h2 || 0
        let progress = variables.progress || -8;
        let methane = variables.methane || 0
        let coal_partial = variables.coal_partial || 0

        if(container.getItem(Co2Input)?.typeId == "cosmos:atmospheric_valve" && entity.getPlanet()?.type == "mars"){
            co2 = Math.min(data.co2.capacity, co2 + 4);
        }
        //processing
        energy = charge_from_machine(entity, block, energy);
        energy = charge_from_battery(entity, energy, BatterySlot)
        if (!(system.currentTick % 20)) energy -= Math.min(5, energy);

        h2 = input_fluid({type: "h2", slot: "h2", liquid_type: "g"}, entity, block, h2)[0]
        methane = output_fluid({type: 'methane', slot: 'methane', liquid_type: "g"}, entity, block, methane);

        let coal_item = container.getItem(CoalItem);
        let can_produce = (h2, methane, co2, coal_item) => (active && h2 > 0 && methane < data.methane.capacity && (co2 > 0 || (coal_item && coal_item.typeId == "cosmos:fragmented_carbon") || coal_partial > 0));

        let status = energy < data.energy.rate ? 
        '§cLow energy' : progress > -8 ? '§2Synthesizing' :
        h2 == 0 ? '§cNo gas': 
        h2 > 0 && !active ? '§2Ready':
        methane == data.methane.capacity ? '§cTank full':
        '§cNeeds carbon';

        if (can_produce(h2, methane, co2, coal_item) && energy > data.energy.rate) {
            const tier = load_dynamic_object(entity, "machine_data", "energy_tier")?.level ?? 1;
            let time = Math.max(1, 4 - tier);
            if(progress <= 0){
                progress = time;
            }else{
                progress--;
                energy -= Math.min(energy, data.energy.rate);
                if(progress <= 0){
                    let produced = produce_methane(co2, h2, methane, coal_partial, coal_item);
                    co2 = produced[0]; h2 = produced[1]; methane = produced[2]; coal_partial = produced[3]; coal_item = produced[4];
                    progress = can_produce(h2, methane, co2, coal_item) ? time: 0;
                    container.setItem(CoalItem, coal_item);
                }
            }
        }else{
            if(progress > 0){
                progress = 0
            }else if(progress-- <= -8){
                progress = -8;
            }
        }

        if(methane > 0){
            let output_canister = container.getItem(MethaneOutput);
            if(output_canister) methane = load_to_canister(output_canister, methane, "methane", container, MethaneOutput);
        }
        save_dynamic_object(entity, {energy, co2, h2, methane, coal_partial, progress}, "machine_data")
            
        //ui display
        if (system.currentTick % 3 == 0) {
            container.add_ui_display(MethaneDisplay, `Gas Storage\n(Methane Gas)\n§e${methane} / ${data.methane.capacity}`, Math.ceil((methane / data.methane.capacity) * 38))
            container.add_ui_display(CO2Display, `Gas Storage\n(Carbon Dioxide)\n§e${co2} / ${data.co2.capacity}`, Math.ceil((co2 / data.co2.capacity) * 38))
            container.add_ui_display(HydrogenDisplay, `Gas Storage\n(Hydrogen Gas)\n§e${h2} / ${data.h2.capacity}`, Math.ceil((h2 / data.h2.capacity) * 38))
            container.add_ui_display(EnergyDisplay, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.ceil((energy / data.energy.capacity) * 55))
            container.add_ui_display(StatusDisplay, `§rStatus:\n  ${status}`)
        }
    },
    onPlace(entity) {
        const initial_state = false
        entity.setDynamicProperty('active', initial_state)
        setup_ui_button(entity, ButtonSlot, ProcessButtonText(initial_state))
    }
}; export default data

const buttons = []; machine_buttons.set('cosmos:methane_synthesizer', buttons)
buttons[ButtonSlot] = function (entity, item) {
    const container = entity.getComponent('minecraft:inventory').container
    const active = entity.getDynamicProperty('active')
    item.nameTag = ProcessButtonText(!active) // flip the button text
    entity.setDynamicProperty('active', !active) // flip the machine state
    container.setItem(ButtonSlot, item)
}

function produce_methane(co2, h2, methane, coal_partial, coal_item){
    if(coal_item?.typeId != "cosmos:fragmented_carbon" && coal_partial == 0){
        if(co2 !== 0){
            co2--;
            if(co2 < 1) return [co2, h2, methane, coal_partial, coal_item];
        }else{
            return [co2, h2, methane, coal_partial, coal_item];
        }
    }
    else{
        if(coal_partial == 0){
            coal_item.decrementStack(1)
        }
        coal_partial++;
        if(coal_partial >= 40){
            coal_partial = 0;
        }
    }
    let space = data.methane.capacity - methane;
    let produced_methane = Math.min(space, 2);
    methane += produced_methane;
    h2 -= Math.min(produced_methane * 8, h2);
    return [co2, h2, methane, coal_partial, coal_item];
}