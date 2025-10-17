import { system, ItemStack } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_machine, charge_from_battery } from "../../matter/electricity"
import { get_data } from "../Machine";

export default class {
    constructor(entity, block) {
        this.entity = entity;
        this.block = block;
        if (entity.isValid) this.electrolyze_water();
    }

    electrolyze_water() {
        //loading data
        const data = get_data(this.entity)
        const container = this.entity.getComponent('minecraft:inventory').container
        const active = this.entity.getDynamicProperty('active')
        
        const variables = load_dynamic_object(this.entity)
        let energy = variables.energy || 0
        let water = variables.water || 0
        let o2 = variables.o2 || 0
        let h2 = variables.h2 || 0

        //processing
        energy = charge_from_machine(this.entity, this.block, energy);
        energy = charge_from_battery(this.entity, energy, 1)
        
        water = insert_water(this.entity, water, data.water.capacity, 0)
        let status = '§6Idle'
        if (o2 + 2 > data.o2.capacity && h2 + 4 > data.h2.capacity) {
            status = '§cTanks Full'
        } else if (active && water && energy) {
            if (energy >= 375) {
                status = '§2Running'
                water --
                o2 = Math.min(o2 + 2, data.o2.capacity)
                h2 = Math.min(h2 + 4, data.h2.capacity)
            }
            const creative_battery = container.getItem(1)?.typeId == "cosmos:creative_battery"
            energy = creative_battery ? energy : Math.max(0, energy - 375)
        }
        save_dynamic_object(this.entity, {energy, water, o2, h2})
        
        //ui display
        if (system.currentTick % 3 == 0) {
            container.add_ui_display(4, `Water Tank\n§e${water} / ${data.water.capacity}`, Math.ceil((water / data.water.capacity) * 38))
            container.add_ui_display(5, `Gas Storage\n(Oxygen Gas)\n§e${o2} / ${data.o2.capacity}`, Math.ceil((o2 / data.o2.capacity) * 38))
            container.add_ui_display(6, `Gas Storage\n(Hydrogen Gas)\n§e${h2} / ${data.h2.capacity}`, Math.ceil((h2 / data.h2.capacity) * 38))
            container.add_ui_display(7, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.ceil((energy / data.energy.capacity) * 55))
            container.add_ui_display(8, `§rStatus:\n  ${energy < 375 ? '§cLow energy' : !water ? '§cNo Water!' : status}`)
        }
        if (!container.getItem(9)) {
            this.entity.setDynamicProperty('active', active == undefined ? false : !active)
            container.add_ui_button(9, active || active == undefined ? "Process" : "Stop")
        }
    }
}

function insert_water(entity, water, capacity, slot) {
    const container = entity.getComponent('minecraft:inventory').container
    const intake_slot = container.getItem(slot)
    if (intake_slot && intake_slot.typeId == "minecraft:water_bucket" && water + 1000 <= capacity) {
        container.setItem(slot, new ItemStack('bucket'))
        return water + 1000
    } else return water
}