import { system } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { output_fluid, load_to_item, load_from_item } from "../../matter/fluids.js";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";
import { machine_buttons, setup_ui_button } from "../MachineButtons.js";

const InputSlot = 0, BatterySlot = 1, OutputSlot = 2
const EnergyDisplay = 3, OilDisplay = 4, FuelDisplay = 5
const StatusDisplay = 6, ButtonSlot = 7
const ProcessButtonText = (state) => state ? 'Refine' : 'Stop Refining'

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

const data = {
	energy: {input: "above", capacity: 16000, maxInput: 150, rate: 60},
	oil: {input: "right", capacity: 24000},
	fuel: {output: "left", capacity: 24000},
	onTick(entity, block) {
		const container = entity.getComponent('minecraft:inventory').container
		const active = entity.getDynamicProperty("active")
		
		const variables = load_dynamic_object(entity, "machine_data")
		const tier = load_dynamic_object(entity, "machine_data", "energy_tier")?.level ?? 1;
		let energy = variables.energy ?? 0
		let oil = variables.oil ?? 0
		let fuel = variables.fuel ?? 0
		
		//charge the machine
		energy = charge_from_machine(entity, block, energy)
		energy = charge_from_battery(entity, energy, BatterySlot)
		if (system.currentTick % 30 == 0) energy -= Math.min(10, energy) // passive energy loss

		//load oil from canister or bucket
		oil = load_from_item(oil, "oil", data.oil.capacity, container, InputSlot)

		/*
		//reject invalid input
		const player_location = dimension.getPlayers({
			location: entity.location,
			closest: 1,
			maxDistance: 6
		})[0]?.location
		if (input && input.typeId != "cosmos:oil_bucket" && player_location) {
			dimension.spawnItem(input, player_location)
			container.setItem(InputSlot)
		}
		*/

		//move fluids
		fuel = load_to_item(fuel, "fuel", container, OutputSlot)
		fuel = output_fluid({type: "fuel", slot: "fuel"}, entity, block, fuel);

		// refine oil
		if (!active && system.currentTick % 2 == 0 && oil > 0 && energy > (data.energy.rate * 2) && fuel < data.fuel.capacity) {
			let melted_amount = Math.min(data.fuel.capacity - fuel, Math.min(oil, tier));
            fuel += melted_amount; oil -= melted_amount; energy -= (data.energy.rate * 2);
			if (system.currentTick % 20 == 0) make_smoke(block)
		}


		// write the status text
		const status = !energy ? "§4No Power"
		: oil == 0 ? "§cNo Oil"
		: energy < (data.energy.rate * 2) ? "§6Not Enough Power"
		: fuel == data.fuel.capacity ? "§cFull"
		: active ? "§6Ready"
		: "§2Refining"

		
		save_dynamic_object(entity, {energy, oil, fuel}, "machine_data")
		
		// setup UI display
		container.add_ui_display(EnergyDisplay, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.round((energy / data.energy.capacity) * 55))
		container.add_ui_display(OilDisplay, `Oil Storage\n§eOil: ${oil} / ${data.oil.capacity} mB`, Math.ceil((Math.ceil(oil / 1000) / (data.oil.capacity / 1000)) * 38))
		container.add_ui_display(FuelDisplay, `Fuel Storage\n§eFuel: ${fuel} / ${data.fuel.capacity} mB`, Math.ceil((Math.ceil(fuel / 1000) / (data.fuel.capacity / 1000)) * 38))
		container.add_ui_display(StatusDisplay, `§rStatus:\n${status}`)
	},
	onPlace(entity) {
		const initial_state = true
		entity.setDynamicProperty('active', initial_state)
		setup_ui_button(entity, ButtonSlot, ProcessButtonText(initial_state))
	}
}; export default data

const buttons = []; machine_buttons.set('cosmos:refinery', buttons)
buttons[ButtonSlot] = function (entity, item) {
	const container = entity.getComponent('minecraft:inventory').container
	const active = entity.getDynamicProperty('active')
	item.nameTag = ProcessButtonText(!active) // flip the button text
	entity.setDynamicProperty('active', !active) // flip the machine state
	container.setItem(ButtonSlot, item)
}