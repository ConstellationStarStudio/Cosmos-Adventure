import { system, ItemStack } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { get_data } from "../Machine";

export default class {
    constructor(entity, block) {
        this.entity = entity;
		this.block = block;
        if (entity.isValid()) this.compress_oxygen()
    }

    onPlace(){
        const container = this.entity.getComponent('minecraft:inventory').container
        const counter = new ItemStack('cosmos:ui')
		counter.nameTag = `Speed ${0}`
		container.setItem(1, counter)
		counter.nameTag = `Space ${0}`
		container.setItem(2, counter)
	}
    compress_oxygen() {
        const in_overworld = this.entity.dimension.id == "minecraft:overworld"
        const container = this.entity.getComponent('minecraft:inventory').container;
        const lore = container.getItem(3)
		const data = get_data(this.entity)
        let energy = this.entity.getDynamicProperty("cosmos_energy");
		energy = energy ? + energy : 0
        let o2 = this.entity.getDynamicProperty("cosmos_o2");
        o2 = o2 ? + o2 : 0

        let first_energy = energy;
        let first_o2 = o2;
        const space = data.o2_capacity - o2
        const speed = in_overworld && energy ? Math.min(186, space) : 0
		
		energy = charge_from_machine(this.entity, this.block, energy)
		
		energy = charge_from_battery(this.entity, energy, 0)

        if (space && energy) {
            energy -= Math.min(10, energy)
            if (system.currentTick % 20 == 0) o2 += speed
        }
        
		const counter = new ItemStack('cosmos:ui')
		counter.nameTag = `Speed ${speed}`
		container.setItem(1, counter)
		counter.nameTag = `Space ${space}`
		container.setItem(2, counter)
        if(o2 !== first_o2) this.entity.setDynamicProperty("cosmos_o2", o2);
        if(energy !== first_energy) this.entity.setDynamicProperty("cosmos_energy", energy);
    }
}

