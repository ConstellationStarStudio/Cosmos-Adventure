import { world, system } from "@minecraft/server";
import { Planet } from "../GalacticraftPlanets.js";

export class Venus extends Planet {
    constructor() {
        super();
        this._type = "venus";
        this._dimensionId = "cosmos:venus";
        this._range = { start: { x: -30000000, z: -30000000 }, end: { x: 30000000, z: 30000000 } };
        this._gravity = 8.87;
        this._center = { x: 0, z: 0 };
        this._fuelMultiplier = 0.9;
        this._solarEnergyMultiplier = 2.37;
    }
    launching() {}
}