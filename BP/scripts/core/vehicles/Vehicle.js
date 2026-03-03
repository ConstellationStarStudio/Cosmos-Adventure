import {system, world} from "@minecraft/server";
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

world.afterEvents.entitySpawn.subscribe((data) => {
    if(data.entity.typeId == "cosmos:rocket_tier_1"){
        reload_vehicle(data.entity)
        let inventory_size = data.entity.getComponent("minecraft:inventory").inventorySize - 2;
        data.entity.nameTag = '§f§u§e§l§' + rocket_nametags[inventory_size];
    }else if(data.entity.typeId == "cosmos:lander"){
        reload_vehicle(data.entity)
        let inventory_size = data.entity.getComponent("minecraft:inventory").inventorySize - 4;
        data.entity.nameTag = '§f§u§e§l§_§c§h§e§s§t§' + rocket_nametags[inventory_size];
    }
});

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