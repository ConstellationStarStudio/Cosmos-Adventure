import { system } from "@minecraft/server"
import { save_dynamic_object, load_dynamic_object} from "../../../api/utils";
import { load_to_canister } from "../../matter/fluids";

export default function(entity){
    if(system.currentTick % 20) return;
    let landing_balloons = entity;
    let inventory = landing_balloons.getComponent('minecraft:inventory');
    let container = inventory.container;
    let fuel = load_dynamic_object(landing_balloons, "vehicle_data")?.fuel || 0;
    if(fuel > 0){
        fuel = load_to_canister(fuel, "fuel", container, 1);
        save_dynamic_object(landing_balloons, {fuel}, "vehicle_data")
    }
    container.add_ui_display(inventory.inventorySize - 4, "", Math.ceil((Math.ceil(fuel/26))))
}