import { world, system } from "@minecraft/server";
import { Planet } from "../../planets/GalacticraftPlanets";
import { place_parachest } from "../../core/machines/blocks/Parachest";
import { set_items_to_vehicle } from "../../core/vehicles/Vehicle";
import { saved_rocket_items } from "../../api/player/liftoff";

export class SpaceStations extends Planet{
    constructor(){
        super();
        this._type = "stations";
        this._range = { start: { x: 50000, z: -100000 }, end: { x: 100000, z: -50000 } },
        this._gravity = 0.0;
        this._center = {x: 0, z: 0};
        this._time = {length: 1, day: 1};
        this._fuelMultiplier = 0.9;
        this._solarEnergyMultiplier = 2;
    }
    launching(player, data, loaded = false){
        let stations_dimension = world.getDimension("cosmos:space_stations");
        let {x, y, z} = data.station.location;
        if(loaded){
            if(data.station.is_generated !== undefined && !data.station.is_generated) stations_dimension.placeFeature("cosmos:station_feature", data.station.location);

            let parachest = stations_dimension.spawnEntity("cosmos:parachute_chest_entity", {x: x - 11.5, y: 255, z: z - 4.5})
            parachest.setProperty("cosmos:parachute", 11);
            parachest.addEffect("slow_falling", 9999, {showParticles: false, amplifier: 3})

            let parachest_falling = system.runInterval(() => {
                if(parachest && parachest.isValid && ((parachest.getVelocity().y >= 0 && parachest.location.y < 250) || parachest.location.y < -64)){
                    system.runTimeout(() => {
                        let parachest_loc = parachest.location;
                        parachest_loc.y = Math.max(parachest_loc.y, -64)
                        let dimension = parachest.dimension;
                        parachest.remove();
                        let parachest_block = place_parachest(data.fuel, dimension, parachest_loc, data.size - 2, 11)
            
                        system.runTimeout(() => {
                             set_items_to_vehicle(parachest_block, data.size - 2, saved_rocket_items.get(data.id), data.typeId);
                             saved_rocket_items.delete(data.id);
                        }, 5);
                    }, 10);
                    system.clearRun(parachest_falling);
                }
            });

            return;
        }

        player.setDynamicProperty('dimension', JSON.stringify(data));
        if(player.dimension.id == "cosmos:space_stations"){ 
            player.teleport({x: 0, y: 500, z: 0}, {dimension: world.getDimension("overworld")})
            return;
        }
        player.teleport({x: x - 3, y: 72, z: z - 3}, {dimension: stations_dimension})
    }
}