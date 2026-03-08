import {system, world, ItemStack} from "@minecraft/server";
import AllVehicles from "./AllVehicles";
import { rocket_nametags } from "../../api/player/liftoff";
export let vehicles = new Map();

function reload_vehicle(entity){
    if (!Object.keys(AllVehicles).includes(entity.typeId) || vehicles.has(entity.id)) return;
    const dynamic_object = JSON.parse(entity.getDynamicProperty("vehicle_data") ?? "{}");
    vehicles.set(entity.id, { entity_data: dynamic_object });
}
world.afterEvents.entityLoad.subscribe(({ entity }) => {
    reload_vehicle(entity);
});

world.afterEvents.worldLoad.subscribe(() => {
    world.getDims(dimension => dimension.getEntities({includeFamilies: ['vehicle']})).forEach(entity => {reload_vehicle(entity)});
    system.runInterval(() => {
        if (vehicles.size === 0) return;
        vehicles.forEach((vehicleData, entityId) => {
            const vehicle = world.getEntity(entityId);
            if(!vehicle?.isValid) return;
            const data = AllVehicles[vehicle.typeId]
            // tick the vehicle
            new data.class(vehicle)
        });
    });
});

world.afterEvents.entitySpawn.subscribe(({entity}) => {
    if(AllVehicles[entity.typeId]){
        reload_vehicle(entity)
        let data = get_vehicle_data(entity)
        let inventory_size = entity.getComponent("minecraft:inventory").inventorySize - data.inventory_index;
        entity.nameTag = data.ui + rocket_nametags[inventory_size];
    }
});

export function get_vehicle_data(vehicle){
    return AllVehicles[vehicle.typeId];
}
export function set_items_to_vehicle(vehicle, size, items_to_set, typeId){
    let container = vehicle.getComponent("minecraft:inventory").container;
    let inventorySize = vehicle.getComponent("minecraft:inventory").inventorySize;
    //checks items_to_set array existence
    if(items_to_set){
        for(let i = 0; i <= (inventorySize - 5); i++){
            container.setItem(i, items_to_set[i])
        }
    }
    //put rocket and launchpad into inventory
    container.setItem(inventorySize - 2, new ItemStack("cosmos:rocket_launch_pad", 9))
    let rocket_item = new ItemStack(typeId + "_item")
    rocket_item.setLore([`§r§7Storage Space: ${size}`])
    rocket_item.setDynamicProperty("inventory_size", size)
    container.setItem(inventorySize - 1, rocket_item)
}