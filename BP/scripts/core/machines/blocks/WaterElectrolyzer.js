import { system } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_machine, charge_from_battery } from "../../matter/electricity"
import { machine_buttons, setup_ui_button } from "../MachineButtons"
import { input_fluid, load_from_item, output_fluid } from "../../matter/fluids"

const InputSlot = 0, BatterySlot = 1, OxygenOutput = 2, HydrogenOutput = 3
const WaterDisplay = 4, OxygenDisplay = 5, HydrogenDisplay = 6, EnergyDisplay = 7
const StatusDisplay = 8, ButtonSlot = 9
const ProcessButtonText = (state) => state ? 'Stop' : 'Process'

const data = {
	energy: {input: "below", capacity: 16000, maxInput: 300},
	water: {input: "right", capacity: 4000},
	o2: {output: "front", capacity: 4000},
	h2: {output: "left", capacity: 4000},
	onTick(entity, block) {
        const container = entity.getComponent('minecraft:inventory').container
        const active = entity.getDynamicProperty('active')
            
        const variables = load_dynamic_object(entity, "machine_data")
        let energy = variables.energy || 0
        let water = variables.water || 0
        let o2 = variables.o2 || 0
        let h2 = variables.h2 || 0

        //processing
        energy = charge_from_machine(entity, block, energy);
        energy = charge_from_battery(entity, energy, BatterySlot)
        
        water = input_fluid({type: "water", slot: "water"}, entity, block, water)[0]
        water = load_from_item(water, "water", data.water.capacity, container, InputSlot)

        o2 = output_fluid({type: 'o2', slot: 'o2', liquid_type: "g"}, entity, block, o2);
        h2 = output_fluid({type: 'h2', slot: 'h2', liquid_type: "g"}, entity, block, h2);

        let status = energy < 375 ? '§cLow energy' : !water ? '§cNo Water!' : '§6Idle'
        if (o2 + 2 > data.o2.capacity && h2 + 4 > data.h2.capacity) status = '§cTanks Full'
        else if (active && water && energy) {
            if (energy >= 375) {
                status = '§2Running'
                water --
                o2 = Math.min(o2 + 2, data.o2.capacity)
                h2 = Math.min(h2 + 4, data.h2.capacity)
            }
            const creative_battery = container.getItem(BatterySlot)?.typeId == "cosmos:creative_battery"
            energy = creative_battery ? energy : Math.max(0, energy - 375)
        }
        save_dynamic_object(entity, {energy, water, o2, h2}, "machine_data")
            
        //ui display
        if ((entity.active_ui || !container.getItem(StatusDisplay)) && system.currentTick % 3 == 0) {
            container.add_ui_display(WaterDisplay, `Water Tank\n§e${water} / ${data.water.capacity}`, Math.ceil((water / data.water.capacity) * 38))
            container.add_ui_display(OxygenDisplay, `Gas Storage\n(Oxygen Gas)\n§e${o2} / ${data.o2.capacity}`, Math.ceil((o2 / data.o2.capacity) * 38))
            container.add_ui_display(HydrogenDisplay, `Gas Storage\n(Hydrogen Gas)\n§e${h2} / ${data.h2.capacity}`, Math.ceil((h2 / data.h2.capacity) * 38))
            container.add_ui_display(EnergyDisplay, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.ceil((energy / data.energy.capacity) * 55))
            container.add_ui_display(StatusDisplay, `§rStatus:\n  ${status}`)
        }
    },
    onPlace(entity) {
        const initial_state = true
        entity.setDynamicProperty('active', initial_state)
        setup_ui_button(entity, ButtonSlot, ProcessButtonText(initial_state))
    }
}; export default data

const buttons = []; machine_buttons.set('cosmos:water_electrolyzer', buttons)
buttons[ButtonSlot] = function (entity, item) {
    const container = entity.getComponent('minecraft:inventory').container
    const active = entity.getDynamicProperty('active')
    item.nameTag = ProcessButtonText(!active) // flip the button text
    entity.setDynamicProperty('active', !active) // flip the machine state
    container.setItem(ButtonSlot, item)
}