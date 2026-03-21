import { system, ItemStack, world } from "@minecraft/server";
import { charge_from_battery, charge_from_machine} from "../../matter/electricity.js";
import { compare_lists, load_dynamic_object, location_of_side, save_dynamic_object } from "../../../api/utils.js";
import { get_data } from "../Machine.js";
import { pads } from "../../vehicles/Vehicle.js";
import { input_fluid, load_from_canister_instant } from "../../matter/fluids.js";

function get_vehicles(block){
	if(!block.isValid) return;
	let {x, y, z} = block.location;

    let pad_one = location_of_side(block, "front")
    let pad_two = location_of_side(block, "back")

	let offset_1 = {x: (x - pad_one.x) * 2, z: (z - pad_one.z) * 2};
	let offset_2 = {x: (x - pad_two.x) * 2, z: (z- pad_two.z) * 2};

    pad_one = block.dimension.getBlock({x: x + offset_1.x, y: y, z: z + offset_1.z});
	pad_two = block.dimension.getBlock({x: x + offset_2.x, y: y, z: z + offset_2.z});

	let vehicles = [];
	[pad_one, pad_two].forEach((pad) => {
		if(pad.permutation.getState("cosmos:center")){
			let vehicle = pad.dimension.getEntities({families: [pads[pad.typeId]], location: pad.center(), maxDistance: 2})[0];
			if(vehicle) vehicles.push(vehicle.id);
		}
	});
    return vehicles;
}

export default function(entity, block) {
	const stopped = entity.getDynamicProperty('stopped')
	const container = entity.getComponent('minecraft:inventory').container
	const data = get_data(entity)
	
	const variables = load_dynamic_object(entity, "machine_data")
	let energy = variables.energy ?? 0
	let fuel = variables.fuel ?? 0
	let vehicles = variables.vehicles ?? [];
	
	energy = charge_from_machine(entity, block, energy)
	
	energy = charge_from_battery(entity, energy, 1)
	
	fuel = input_fluid("fuel", entity, block, fuel)
	fuel = load_from_canister_instant(fuel, "fuel", entity, 0).amount;
	if(!stopped && vehicles.length > 0 && energy > 0 && fuel >= 2 && block){
			vehicles.forEach((vehicle) =>{
				vehicle = world.getEntity(vehicle);
				if(!vehicle || !vehicle.isValid) return;
				let vehicle_dynamic_object = load_dynamic_object(vehicle, "vehicle_data")
				let fuel_level = vehicle_dynamic_object?.fuel ?? 0;
				if(fuel_level < 1000){
				let level = Math.min(1000, fuel_level + 2)
				vehicle_dynamic_object.fuel = level;
				save_dynamic_object(vehicle, vehicle_dynamic_object, "vehicle_data");
				fuel = Math.max(0, fuel - 2)
				energy = Math.max(0, energy - 30)
			}
		})
	}

	if(system.currentTick % 100 == 0) vehicles = get_vehicles(block);
	save_dynamic_object(entity, {energy, fuel, vehicles}, "machine_data")
	
	const status =
		energy == 0 ? "§4No Power" : 
		fuel == 0 ? "§4No Fuel to Load" :
		stopped ? "§6Ready" :
		energy < 30 ? "§6Not Enough Power" :
		"§2Load Fuel"
	
	container.add_ui_display(2, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.round((energy / data.energy.capacity) * 55))
	container.add_ui_display(3, `Fuel Storage\n§eFuel: ${fuel} / ${data.fuel.capacity} mB`, Math.ceil((Math.ceil(fuel / 1000) / (data.fuel.capacity / 1000)) * 38))
	container.add_ui_display(4, `§rStatus: ${status}`)
	if (!container.getItem(5)) {
		entity.setDynamicProperty('stopped', !stopped)
		container.add_ui_button(5, stopped ? 'Stop Loading' : 'Loading')
	}
}
