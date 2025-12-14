import {system, world} from "@minecraft/server";
import AllVehicles from "./AllVehicles";
import { rocket_nametags } from "../../api/player/liftoff";
export let vehicles = new Map();

function reload_vehicle(entity){
    if (!Object.keys(AllVehicles).includes(entity.typeId) || vehicles.has(entity.id)) return;
    const dynamic_object = JSON.parse(entity.getDynamicProperty("vehicle_data") ?? "{}");
    machine_entities.set(entity.id, { entity_data: dynamic_object });
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
            // tick the machine
            new data.class(machineEntity)
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