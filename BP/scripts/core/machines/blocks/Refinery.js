import { system, ItemStack } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { output_fluid, load_to_canister, load_from_canister_instant } from "../../matter/fluids.js";
import { get_data } from "../Machine.js";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";

function make_smoke({dimension, x, y, z}) {
	const flame = (X, Y, Z) => {dimension.spawnParticle('minecraft:basic_flame_particle', {x: x + X, y: y + Y, z: z + Z})}
	const smoke = (X, Y, Z) => {dimension.spawnParticle('minecraft:basic_smoke_particle', {x: x + X, y: y + Y, z: z + Z})}
	flame(0.5, 0.95, 0.5); smoke(0.5, 0.9, 0.5)
	flame(0.6, 0.95, 0.4); smoke(0.7, 0.9, 0.3)
	flame(0.6, 0.95, 0.6); smoke(0.7, 0.9, 0.7)
	flame(0.4, 0.95, 0.4); smoke(0.3, 0.9, 0.3)
	flame(0.4, 0.95, 0.6); smoke(0.3, 0.9, 0.7)
	smoke(0.5, 1, 0.7); smoke(0.7, 1, 0.5)
	smoke(0.5, 1, 0.3); smoke(0.3, 1, 0.5)
}

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        if (entity.isValid) this.refine()
    }

    refine() {
		//load data
		const data = get_data(this.entity)
        const container = this.entity.getComponent('minecraft:inventory').container
		const dimension = this.entity.dimension
		const active = this.entity.getDynamicProperty("active")
		
		const variables = load_dynamic_object(this.entity)
		let energy = variables.energy ?? 0
		let oil = variables.oil ?? 0
		let fuel = variables.fuel ?? 0
		
		//charge the machine
	    energy = charge_from_machine(this.entity, this.block, energy)
		energy = charge_from_battery(this.entity, energy, 1)

		//energy loss
		if (system.currentTick % 30 == 0) energy -= Math.min(10, energy)

		//load oil from canister or bucket
		oil = load_from_canister_instant(oil, "oil", this.entity, 0).amount;

		/*
		//reject invalid input
		const player_location = dimension.getPlayers({
			location: this.entity.location,
			closest: 1,
			maxDistance: 6
		})[0]?.location
		if (input && input.typeId != "cosmos:oil_bucket" && player_location) {
			dimension.spawnItem(input, player_location)
			container.setItem(0)
		}
		*/

		//move fluids
		fuel = load_to_canister(fuel, "fuel", container, 2)
		fuel = output_fluid("fuel", this.entity, this.block, fuel)

		// refine oil
		if (!active && system.currentTick % 2 == 0 && oil > 0 && energy > 0 && fuel < data.fuel.capacity) {
			if (energy >= 120) {oil-- ; fuel++; energy -= 120 }
			if (system.currentTick % 20 == 0) make_smoke(this.block)
		}


		// write the status text
		const status =
		energy == 0 ? "§4No Power" : 
		oil == 0 ? "§cNo Oil" :
		energy < 120 ? "§6Not Enough Power" : 
		fuel == data.fuel.capacity ? "§cFull" :
		active ? "§6Ready" : 
		"§2Refining"

		
		save_dynamic_object(this.entity, {energy, oil, fuel})
		
		// setup UI display
		container.add_ui_display(3, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.round((energy / data.energy.capacity) * 55))
		container.add_ui_display(4, `Oil Storage\n§eOil: ${oil} / ${data.oil.capacity} mB`, Math.ceil((Math.ceil(oil / 1000) / (data.oil.capacity / 1000)) * 38))
        container.add_ui_display(5, `Fuel Storage\n§eFuel: ${fuel} / ${data.fuel.capacity} mB`, Math.ceil((Math.ceil(fuel / 1000) / (data.fuel.capacity / 1000)) * 38))
		container.add_ui_display(6, `§rStatus:\n${status}`)
        if (!container.getItem(7)) {
            this.entity.setDynamicProperty('active', !active)
            container.add_ui_button(7, active ? 'Stop Refining' : 'Refine')
        }
	}
}

