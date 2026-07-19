import { system } from "@minecraft/server";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { fluid_names, fluid_textures, input_fluid, load_from_canister, load_to_canister, output_fluid } from "../../matter/fluids";
import { machine_buttons, setup_ui_button } from "../MachineButtons";

const InputSlot = 0, BatterySlot = 1, OutputSlot = 2
const GasDisplay = 3, GasTexture = 4
const LiquidDisplay = 5, LiquidTexture = 6
const EnergyDisplay = 7, StatusDisplay = 8, ButtonSlot = 9
const ProcessButtonText = (state) => state ? 'Process' : 'Stop'

const data = {
	energy: { input: "below", capacity: 16000, maxInput: 150, rate: 60},
	gas: { input: "right", capacity: 4000 },
	liquid: { output: "left", capacity: 2000 },
	onTick(entity, block) {
		const container = entity.getComponent('minecraft:inventory').container
		const active = entity.getDynamicProperty('active')

		// load variables
		const variables = load_dynamic_object(entity, "machine_data")
		let energy = variables.energy ?? 0
		let gas = variables.input_tank ?? {amount: 0}
		let liquid = variables.output_tank ?? {amount: 0}
		
		// manage energy
		energy = charge_from_machine(entity, block, energy)
		energy = charge_from_battery(entity, energy, BatterySlot)
		if (system.currentTick % 30 == 0) energy = Math.max(0, energy - 10)

		let input_gas = input_fluid({type: gas.type, slot: "gas", liquid_type: "g"}, entity, block, gas.amount);
		gas.amount = input_gas[0];
		gas.type = input_gas[1];
		if(gas.amount === 0) gas.type = undefined;
		if(liquid.amount === 0) liquid.type = undefined;
		// manage fluids
		const empty = gas.type == undefined;
		const canister = container.getItem(InputSlot); if (canister) {
			// fill with O2 gas
			if (canister.typeId == "cosmos:o2_canister" && (empty || gas.type == "o2")) {
				gas.type = "o2"
				gas.amount = load_from_canister({
					canister, ratio: 0.5,
					amount: gas.amount,
					capacity: data.gas.capacity,
					container, slot: InputSlot
				})
			}
			// fill with N2 gas
			else if (canister.typeId == "cosmos:n2_canister" && (empty || gas.type == "n2")) {
				gas.type = "n2"
				gas.amount = load_from_canister({
					canister, ratio: 0.5,
					amount: gas.amount,
					capacity: data.gas.capacity,
					container, slot: InputSlot
				})
			}
			// fill with Methane gas
			else if (canister.typeId == "cosmos:methane_canister" && (empty || gas.type == "methane")) {
				gas.type = "methane"
				gas.amount = load_from_canister({
					canister,
					amount: gas.amount,
					capacity: data.gas.capacity,
					container, slot: InputSlot
				})
			}
		}
		
		if(energy > data.energy.rate && gas.amount > 0 && !entity.getDynamicProperty("active") && (!liquid.type || gas.type == liquid.type || (gas.type == "methane" && liquid.type == "fuel"))){
			liquid.type = (gas.type == "methane") ? "fuel": gas.type;
			let space = data.liquid.capacity - liquid.amount;
			let added_amount = Math.min(space, Math.floor(Math.min(gas.amount / 2, 3)))
            liquid.amount += added_amount;
			gas.amount -= Math.min(gas.amount, added_amount * 2);
		}
		
		if(liquid.type && liquid.amount > 0){
			let output_canister = container.getItem(OutputSlot);
			if(output_canister) liquid.amount = load_to_canister(output_canister, liquid.amount, liquid.type, container, OutputSlot);
			liquid.amount = output_fluid({type: liquid.type, slot: "liquid", liquid_type: "l"}, entity, block, liquid.amount);
		}
		// makes snow particles that fall on the sides
		// oxygen gas into liquid oxygen
		// nitrogen gas into liquid nitrogen
		// methane into fuel
		// liquid nitrogen from overworld air
		// mars atmo gases into liquid argon
		// venus has Co2(for Methane Synthesizer) and Nitrogen(for GasLiquefier)

		save_dynamic_object(entity, {energy, input_tank: gas, output_tank: liquid}, "machine_data")

		if(entity.active_ui || !container.getItem(StatusDisplay)){
			const status = energy == 0 ? "§cLow energy"
			: gas.amount == 0 ? "§cNo gas"
			: liquid.amount == data.liquid.capacity ? "§cTanks full"
			: active ? "§6Ready"
			: "§2Liquefying"

			// UI Display:
			container.add_ui_display(EnergyDisplay, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.ceil((energy / data.energy.capacity) * 55))
			container.add_ui_display(GasDisplay, `Gas Storage\n(${fluid_names[gas.type]})\n§e${gas.amount} / ${data.gas.capacity}`, Math.ceil((gas.amount / data.gas.capacity) * 38))
			container.add_ui_display(GasTexture, '', fluid_textures[gas.type] ?? 0)
			container.add_ui_display(LiquidDisplay, `Liquid Tank\n(${fluid_names[liquid.type]})\n§e${liquid.amount} / ${data.liquid.capacity}`, Math.ceil((liquid.amount / data.liquid.capacity) * 38))
			container.add_ui_display(LiquidTexture, '', fluid_textures[liquid.type] ?? 0)
			container.add_ui_display(StatusDisplay, `§rStatus:\n ${status}`)
		}
	},
	onPlace(entity) {
		entity.setDynamicProperty('active', true) // initial state is on
		setup_ui_button(entity, ButtonSlot, ProcessButtonText(true))
	}
}; export default data

const buttons = []; machine_buttons.set('cosmos:gas_liquefier', buttons)
buttons[ButtonSlot] = function (entity, item) {
	const container = entity.getComponent('minecraft:inventory').container
	const active = entity.getDynamicProperty('active')
	item.nameTag = ProcessButtonText(!active) // flip the button text
	entity.setDynamicProperty('active', !active) // flip the machine state
	container.setItem(ButtonSlot, item)
}