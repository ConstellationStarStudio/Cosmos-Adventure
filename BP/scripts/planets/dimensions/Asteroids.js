import { world, system } from "@minecraft/server";
import { Planet } from "../GalacticraftPlanets.js";

export class Asteroids extends Planet {
    constructor() {
        super();
        this._type = "asteroids";
        this._dimensionId = "cosmos:asteroids";
        this._range = { start: { x: -30000000, z: -30000000 }, end: { x: 30000000, z: 30000000 } };
        this._gravity = 0.05;
        this._center = { x: 0, z: 0 };
        this._fuelMultiplier = 0.9;
        this._solarEnergyMultiplier = 0.77;
    }
    launching() {}
}