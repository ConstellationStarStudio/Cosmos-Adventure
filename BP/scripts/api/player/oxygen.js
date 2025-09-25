import { world, system } from "@minecraft/server";
import { space_gear_entities } from "./space_gear";

export let tanks = {
    "cosmos:oxygen_tank_light_full": 900,
    "cosmos:oxygen_tank_med_full": 1800,
    "cosmos:oxygen_tank_heavy_full": 2700

}
export function oxygen_spending(player){
    let space_gear = JSON.parse(player.getDynamicProperty("space_gear") ?? '{}');
    let tank1 = space_gear["tank1"]?.split(' ')
    let tank2 = space_gear["tank2"]?.split(' ')
    let space_gear_id = space_gear_entities.get(player.nameTag)
        
    //if (no tank1 or tank1 is empty and no tank2) or tank2 is empty or no mask or no gear
    if(((!tank1 || tank1[1] == "0") && (!tank2 || tank2[1] == "0")) || (!space_gear["mask"] || !space_gear["gear"])){
        oxygen_hunger(player);
        return;
    };
        
    if(tank1 && tank1[1] !== "0"){
        space_gear["tank1"] = tank1[0] + ' ' + Math.max(0, tank1[1] - 1);
        player.setDynamicProperty("space_gear", JSON.stringify(space_gear));
        if(space_gear_id){
            let space_gear_entity = world.getEntity(space_gear_id)?.getComponent("inventory").container;
            let new_tank = space_gear_entity?.getItem(4);
            space_gear_entity?.setItem(4, update_tank(new_tank, Math.max(0, tank1[1] - 1)))
        }
    }else if(tank2 && tank2[1] !== "0"){
        space_gear["tank2"] = tank2[0] + ' ' + Math.max(0, tank2[1] - 1);
        player.setDynamicProperty("space_gear", JSON.stringify(space_gear));
        if(space_gear_id){
            let space_gear_entity = world.getEntity(space_gear_id)?.getComponent("inventory").container;
            let new_tank = space_gear_entity.getItem(5);
            space_gear_entity.setItem(5, update_tank(new_tank, Math.max(0, tank2[1] - 1)))
        }
    }
    oxygen_bar(player, [tank1 ? tank1: 0, tank2 ? tank2: 0])
}

function oxygen_hunger(player){
    player.addTag("oxygen_hunger");
    system.runTimeout(() => {
        let cycle = system.runInterval(() => {
            if(!player  || !player.isValid || !player.hasTag("oxygen_hunger")){
                system.clearRun(cycle);
                return;
            }
            player.onScreenDisplay.setTitle(`cosmos:O1:${0},O2:${0},T:${0}`);
            player.applyDamage(1);
           
            let space_gear = JSON.parse(player.getDynamicProperty("space_gear") ?? '{}');
            let tank1 = space_gear["tank1"]?.split(' ')
            let tank2 = space_gear["tank2"]?.split(' ')

            if((space_gear && ((tank1 && tank1[1] !== "0") || (tank2 && tank2[1] !== "0")) && (space_gear["mask"] && space_gear["gear"])) || is_entity_in_a_bubble(player)){
                system.clearRun(cycle)
                player.removeTag("oxygen_hunger")
            }
        }, 20);
    }, 100);
}
export function update_tank(tank, o2) {
	tank.setLore([`${o2}`])
    const durability = tank.getComponent('minecraft:durability');
    o2 = Math.min(durability.maxDurability, o2)
    durability.damage = durability.maxDurability - o2
    return tank;
}
function oxygen_bar(player, o2){
    let oxygen_1 = (o2[0][1])? (45/tanks[o2[0][0]]) * o2[0][1]:
    0;
    let oxygen_2 = (o2[1][1])? (45/tanks[o2[1][0]]) * o2[1][1]:
    0;
    player.onScreenDisplay.setTitle(`cosmos:O1:${Math.floor(oxygen_1)},O2:${Math.floor(oxygen_2)},T:${0}`);
}

export function is_entity_in_a_bubble(entity){
    let {x, y, z} = entity.location;
    let bubbles = entity.dimension.getEntities({type: "cosmos:oxygen_distributor", location: {x: x, y: y, z: z}, maxDistance: 10, includeTags: ["bubble_active"]});
    if(!bubbles.length) return false;
    for(let bubble of bubbles){
        let {x: bubble_x, y: bubble_y, z: bubble_z} = bubble.location;
        let radius = bubble.getDynamicProperty("bubble_radius") ?? 0;
        if(Math.sqrt((bubble_x - x) ** 2 + (bubble_y - y) ** 2 + (bubble_z - z) ** 2) < radius){
            return true;
        }
    }
    return false;
}