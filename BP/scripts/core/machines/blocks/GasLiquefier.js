import { system } from "@minecraft/server";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { get_data } from "../Machine";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { fluid_names, load_from_canister } from "../../matter/fluids";

export default class {
	constructor(entity, block) {
		this.entity = entity;
		this.block = block;
		if (entity.isValid) {
			this.liquefyGas();
		}
	}


	liquefyGas() {
        //loading data
		const data = get_data(this.entity)
		const container = this.entity.getComponent('minecraft:inventory').container
        const active = this.entity.getDynamicProperty('active')

        //loading variables
		const variables = load_dynamic_object(this.entity)
		let energy = variables.energy || 0
		let input_tank = variables.input_tank ?? {amount: 0}
		let output_tank = variables.output_tank ?? {amount: 0}
		
		//managing energy
		energy = charge_from_machine(this.entity, this.block, energy)
		energy = charge_from_battery(this.entity, energy, 1)

		//manage fluids
		const input = container.getItem(0)
		if (input && input.typeId == "cosmos:o2_canister" && ["o2_gas", undefined].includes(input_tank.type)) {
			input_tank = { type: "o2_gas", amount: load_from_canister({
				item: input, ratio: 2,
				amount: input_tank.amount,
				capacity: data.gas.capacity,
				container, slot: 0
			})}
		}
		if (input && input.typeId == "cosmos:n2_canister" && ["n2_gas", undefined].includes(input_tank.type)) {
			input_tank = { type: "n2_gas", amount: load_from_canister({
				item: input, ratio: 2,
				amount: input_tank.amount,
				capacity: data.gas.capacity,
				container, slot: 0
			})}
		}
		if (input && input.typeId == "cosmos:methane_canister" && ["methane_gas", undefined].includes(input_tank.type)) {
			input_tank = { type: "methane_gas", amount: load_from_canister({
				item: input, ratio: 1,
				amount: input_tank.amount,
				capacity: data.gas.capacity,
				container, slot: 0
			})}
		}

		//makes snow particles that fall on the sides
		//oxygen gas into liquid oxygen
		//nitrogen gas into liuquid nitrogen
		//methane into fuel
		//liquid nitrogen from overworld air
		//mars Co2 into liquid argon
		// venus has Co2(for MS) and Nitrogen(for GL)

		save_dynamic_object(this.entity, {energy, input_tank, output_tank})

        //ui display
		container.add_ui_display(3, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.ceil((energy / data.energy.capacity) * 55))
		container.add_ui_display(4, `Gas Storage\n(${fluid_names[input_tank.type]})\n§e${input_tank.amount} / ${data.gas.capacity}`, Math.ceil((input_tank.amount / data.gas.capacity) * 38))
		container.add_ui_display(5, `Liquid Tank\n(${fluid_names[output_tank.type]})\n§e${output_tank.amount} / ${data.liquid.capacity}`, Math.ceil((output_tank.amount / data.liquid.capacity) * 38))
	}
}