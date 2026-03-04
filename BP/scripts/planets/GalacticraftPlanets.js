import { world, system } from "@minecraft/server";
import { isUnderground } from "../api/utils";
import { return_to_earth } from "./dimensions/Overworld";

export class Planet{
    constructor(){
        this._type;
        this._gravity;
        this._range;
        this._time;
        this._center;
    }
    get type(){
        return this._type;
    }
    get range() {
        return {
            start: { x: this._range.start.x, z: this._range.start.z },
            end: { x: this._range.end.x, z: this._range.end.z }
        };
    }
    get center() {
        return {
            x: this._center.x,
            z: this._center.z
        };
    }
    get time() {
        return this._time;
    }
    get gravity() {
        return this._gravity;
    }
    offset(location) {
        return {
            x: location.x - this._center.x,
            y: location.y, 
            z: location.z - this._center.z
        };
    }
    getTimeOfDay(){
        return world.getAbsoluteTime() % this._time.length;
    }
}
// Returns the coordinates that should be displayed on the screen
function planet_coords(entity){
  let planet = entity.getPlanet();
  return planet?.offset(entity.location) || entity.location;
}
export function coords_loop(player){
    let {x, y, z} = planet_coords(player)
    x = Math.floor(x); y = Math.floor(y + 0.000001); z = Math.floor(z);
    player.onScreenDisplay.setActionBar(`Position: ${x}, ${y}, ${z}`)
}
world.afterEvents.gameRuleChange.subscribe(({rule, value}) => {
    if (rule == "showCoordinates" && value == false)
        world.getAllPlayers().forEach(player =>
            player.onScreenDisplay.setActionBar(`§.`)
        )
    }
)

world.afterEvents.playerDimensionChange.subscribe((data) => {
    if(!data.player.getDynamicProperty('dimension')) return;
    let player_data = JSON.parse(data.player.getDynamicProperty('dimension'));
    data.player.setDynamicProperty("dimension");
    
    if(player_data.type !== "overworld"){
        let planet = world.getPlanet(player_data.type);
        planet.launching(data.player, player_data, true);
    }else return_to_earth(data.player, player_data)
});

//system of cleaning entity that were spawned in night
const evolved_mobs = ["cosmos:evolved_zombie", "cosmos:evolved_creeper", "cosmos:evolved_skeleton"]
world.afterEvents.entitySpawn.subscribe(({entity, cause}) => {
    if(entity.isValid && cause == "Spawned" && evolved_mobs.includes(entity.typeId)){
        let planet = entity.getPlanet();
        if(planet && planet.getTimeOfDay() < planet.time.day && !isUnderground(entity)) entity.remove()
        else if(planet && entity.typeId !== "cosmos:evolved_creeper") entity.addTag("hostile_space_mob")
    }
});

world.afterEvents.worldLoad.subscribe(() => {
    system.runInterval(() => {
        let mobs = world.getDimension("the_end").getEntities({tags: ["hostile_space_mob"]});
        mobs.forEach((mob) => {
            if(!mob.isValid) return;
            let planet = mob.getPlanet();
            if(planet && !isUnderground(mob) && planet.getTimeOfDay() < planet.time.day) mob.setOnFire(10)
        });
    }, 100);
});