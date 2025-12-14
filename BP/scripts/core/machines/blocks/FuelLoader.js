import { system, ItemStack } from "@minecraft/server";
import { charge_from_battery, charge_from_machine} from "../../matter/electricity.js";
import { compare_lists, load_dynamic_object, location_of_side, save_dynamic_object } from "../../../api/utils.js";
import { get_data } from "../Machine.js";
import { input_fluid, load_from_canister_instant } from "../../matter/fluids.js";

function get_rockets(block){
	if(!block.location) return;
    let rockets = []
    let pad_one = location_of_side(block, "front")
    let pad_two = location_of_side(block, "back")
    pad_one = (pad_one)? block.dimension.getBlock({x: block.location.x + ((pad_one.x - block.location.x) * 2), y: block.location.y, z: block.location.z + ((pad_one.z - block.location.z) * 2)}):
	undefined;
    pad_two = (pad_two)? block.dimension.getBlock({x: block.location.x + ((pad_two.x - block.location.x) * 2), y: block.location.y, z: block.location.z + ((pad_two.z - block.location.z) * 2)}):
	undefined;
    pad_one = (pad_one && !pad_one.isAir && pad_one.typeId === "cosmos:rocket_launch_pad" && pad_one.permutation.getState("cosmos:center"))? pad_one:
    undefined;
    pad_two = (pad_two && !pad_two.isAir && pad_two.typeId === "cosmos:rocket_launch_pad" && pad_two.permutation.getState("cosmos:center"))? pad_two:
    undefined;
    let rocket_one = (pad_one)? pad_one.dimension.getEntities({type: "cosmos:rocket_tier_1", location: pad_one.center(), maxDistance: 1}):
    [];
    let rocket_two = (pad_two)? pad_two.dimension.getEntities({type: "cosmos:rocket_tier_1", location: pad_two.center(), maxDistance: 1}):
    [];
    if(rocket_one.length > 0) rockets.push(rocket_one[0])
    if(rocket_two.length > 0) rockets.push(rocket_two[0])
    return rockets;
}

export default class {
    constructor(entity, block) {
        this.entity = entity;
		this.block = block;
        if (entity.isValid) this.load_fuel()
    }
    load_fuel(){
        const stopped = this.entity.getDynamicProperty('stopped')
        const container = this.entity.getComponent('minecraft:inventory').container
		const data = get_data(this.entity)
		
		const variables = load_dynamic_object(this.entity, "machine_data")
		let energy = variables.energy ?? 0
		let fuel = variables.fuel ?? 0
		
	    energy = charge_from_machine(this.entity, this.block, energy)
		
		energy = charge_from_battery(this.entity, energy, 1)
		
		fuel = input_fluid("fuel", this.entity, this.block, fuel)
		fuel = load_from_canister_instant(fuel, "fuel", this.entity, 0).amount;
		if(!stopped && energy > 0 && fuel >= 2 && this.block){
		    let rockets = get_rockets(this.block)
		    if(rockets.length > 0){
		        rockets.forEach((rocket) =>{
					let rocket_dynamic_object = load_dynamic_object(rocket, "vehicle_data")
		            let fuel_level = rocket_dynamic_object?.fuel ?? 0;
		            fuel_level = (fuel_level)? fuel_level:
		            0;
		            if(fuel_level < 1000){
		                let level = Math.min(1000, fuel_level + 2)
		                save_dynamic_object(rocket, rocket_dynamic_object, "vehicle_data");
		                fuel = Math.max(0, fuel - 2)
		                energy = Math.max(0, energy - 30)
		            }
		        })
		        
		    }
		}
		save_dynamic_object(this.entity, {energy, fuel}, "machine_data")
		
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
            this.entity.setDynamicProperty('stopped', !stopped)
            container.add_ui_button(5, stopped ? 'Stop Loading' : 'Loading')
        }
		
	}
}
