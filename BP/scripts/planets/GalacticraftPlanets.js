import { world, system } from "@minecraft/server";
import { isUnderground } from "../api/utils.js";
import { return_to_earth } from "./dimensions/Overworld.js";

export class Planet {
    constructor() {
        this._type = "";
        this._dimensionId = "";
        this._gravity = 9.8;
        this._range = { start: { x: -30000000, z: -30000000 }, end: { x: 30000000, z: 30000000 } };
        this._time = { length: 24000, day: 12000 };
        this._center = { x: 0, z: 0 };
        this._fuelMultiplier = 1.0;
        this._solarEnergyMultiplier = 1.0;
    }
    get type() {
        return this._type;
    }
    get dimensionId() {
        return this._dimensionId;
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
    get fuelMultiplier() {
        return this._fuelMultiplier;
    }
    get solarEnergyMultiplier() {
        return this._solarEnergyMultiplier;
    }
    offset(location) {
        return {
            x: location.x - this._center.x,
            y: location.y, 
            z: location.z - this._center.z
        };
    }
    getTimeOfDay() {
        return world.getAbsoluteTime() % (this._time?.length || 24000);
    }
}

// Returns the coordinates that should be displayed on the screen
function planet_coords(entity) {
    let planet = entity.getPlanet();
    return planet?.offset(entity.location) || entity.location;
}

export function coords_loop(player) {
    let { x, y, z } = planet_coords(player);
    x = Math.floor(x);
    y = Math.floor(y + 0.000001);
    z = Math.floor(z);
    player.onScreenDisplay.setActionBar(`Position: ${x}, ${y}, ${z}`);
}

world.afterEvents.gameRuleChange.subscribe(({ rule, value }) => {
    if (rule === "showCoordinates" && value === false) {
        world.getAllPlayers().forEach(player =>
            player.onScreenDisplay.setActionBar(`§.`)
        );
    }
});

world.afterEvents.playerDimensionChange.subscribe((data) => {
    if (!data.player.getDynamicProperty('dimension')) return;
    let player_data = JSON.parse(data.player.getDynamicProperty('dimension'));
    data.player.setDynamicProperty('dimension');
    let planet = world.getPlanet(player_data.type);

    if (player_data.type !== "overworld") {
        if (planet) {
            planet.launching(data.player, player_data, true);
        }
    } else {
        return_to_earth(data.player, player_data, player_data.place_parachest);
    }
});

// System of cleaning entities that were spawned at night
const evolved_mobs = ["cosmos:evolved_zombie", "cosmos:evolved_creeper", "cosmos:evolved_skeleton", "cosmos:evolved_spider"];
world.afterEvents.entitySpawn.subscribe(({ entity, cause }) => {
    if (entity.isValid && cause === "Spawned" && evolved_mobs.includes(entity.typeId)) {
        let planet = entity.getPlanet();
        if (planet && planet.getTimeOfDay() < planet.time.day && !isUnderground(entity)) {
            entity.remove();
        } else if (planet && entity.typeId !== "cosmos:evolved_creeper" && entity.typeId !== "cosmos:evolved_spider") {
            entity.addTag("hostile_space_mob");
        }
    }
});

world.afterEvents.worldLoad.subscribe(() => {
    system.runInterval(() => {
        for (const dimId of ["cosmos:moon", "cosmos:mars"]) {
            try {
                const dim = world.getDimension(dimId);
                if (!dim) continue;
                let mobs = dim.getEntities({ tags: ["hostile_space_mob"] });
                mobs.forEach((mob) => {
                    if (!mob.isValid) return;
                    let planet = mob.getPlanet();
                    if (planet && !isUnderground(mob) && planet.getTimeOfDay() < planet.time.day) {
                        mob.setOnFire(10);
                    }
                });
            } catch (e) {}
        }
    }, 100);
});