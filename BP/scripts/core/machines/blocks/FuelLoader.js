import { system, world } from "@minecraft/server";
import { charge_from_battery, charge_from_machine} from "../../matter/electricity.js";
import { load_dynamic_object, location_of_side, save_dynamic_object, load_machine_data, save_machine_data } from "../../../api/utils.js";
import { pads, vehicles } from "../../vehicles/Vehicle.js";
import { input_fluid, load_from_item } from "../../matter/fluids.js";
import { machine_buttons, setup_ui_button } from "../MachineButtons"

const InputSlot = 0, BatterySlot = 1
const EnergyDisplay = 2, FuelDisplay = 3
const StatusDisplay = 4, ButtonSlot = 5
const LoadButtonText = (status) => status ? 'Stop Loading' : 'Load Fuel'

function get_vehicles(block) {
	if(!block.isValid) return;
	let {x, y, z} = block.location;

    let front = location_of_side(block, "front")
    let back = location_of_side(block, "back")

	const front_offset = {x: (x - front.x) * 2, z: (z - front.z) * 2};
	const back_offset = {x: (x - back.x) * 2, z: (z- back.z) * 2};

    front = block.dimension.getBlock({x: x + front_offset.x, y: y, z: z + front_offset.z});
	back = block.dimension.getBlock({x: x + back_offset.x, y: y, z: z + back_offset.z});

	return [front, back].map(pad => {
		if (!pad.permutation.getState("cosmos:center")) return
		return pad.dimension.getEntities({families: [pads[pad.typeId]], location: pad.center(), maxDistance: 2})[0]
	}).filter(Boolean)
}

const data = {
	energy: {input: "right", capacity: 16000, maxInput: 75, rate: 30},
	fuel: {input: "left", capacity: 12000},
	onTick(block, ui_opened) {
		const active = block.getComponent("minecraft:dynamic_properties").get('active')
		const container = block.getComponent('minecraft:inventory').container
		
		const variables = load_machine_data(block);
		let energy = variables.energy ?? 0
		let fuel = variables.fuel ?? 0
		
		energy = charge_from_machine(block, energy)
		energy = charge_from_battery(block, energy, BatterySlot)
		
		fuel = input_fluid({type: "fuel", slot: "fuel", liquid_type: "l"}, block, fuel)[0];
		fuel = load_from_item(fuel, "fuel", data.fuel.capacity, container, InputSlot)

		if (active && energy > data.energy.rate && fuel >= 2 && block) {
			const vehicles = system.currentTick % 100 == 0 ? (block.vehicles = get_vehicles(block)) : block.vehicles ?? []
			vehicles.forEach((vehicle) => {
				if (!vehicle || !vehicle.isValid) return
				let vehicle_data = load_dynamic_object(vehicle, "vehicle_data") ?? {}
				let fuel_level = vehicle_data.fuel ?? 0
				if (fuel_level >= 1000) return
				vehicle_data.fuel = Math.min(1000, fuel_level + 2)
				save_dynamic_object(vehicle, vehicle_data, "vehicle_data")
				fuel = Math.max(0, fuel - 2)
				energy = Math.max(0, energy - data.energy.rate)
			})
		}

		save_machine_data(block, {energy, fuel})

		if(ui_opened || !container.getItem(StatusDisplay)){
			const status = fuel == 0 ? "§4No Fuel to Load"
			: energy <= data.energy.rate ? "§4Not Enough Power"
		    : active ? "§2Active"
		    : "§6Ready"
		
		    container.add_ui_display(EnergyDisplay, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.round((energy / data.energy.capacity) * 55))
		    container.add_ui_display(FuelDisplay, `Fuel Storage\n§eFuel: ${fuel} / ${data.fuel.capacity} mB`, Math.ceil((Math.ceil(fuel / 1000) / (data.fuel.capacity / 1000)) * 38))
		    container.add_ui_display(StatusDisplay, `§rStatus: ${status}`)
		}
	},
	onPlace(block) {
		const initial_state = true
		block.getComponent("minecraft:dynamic_properties").set('active', initial_state)
		setup_ui_button(block, ButtonSlot, LoadButtonText(initial_state))
	}
}; export default data

const buttons = []; machine_buttons.set('cosmos:fuel_loader', buttons)
buttons[ButtonSlot] = function (block, item) {
	const container = block.getComponent('minecraft:inventory').container
	const active = block.getComponent("minecraft:dynamic_properties").get('active')
	item.nameTag = LoadButtonText(!active) // flip the button text
	block.getComponent("minecraft:dynamic_properties").set('active', !active) // flip the machine state
	container.setItem(ButtonSlot, item)
}