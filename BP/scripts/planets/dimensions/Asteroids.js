import { world, system } from "@minecraft/server";
import { Planet } from "../../planets/GalacticraftPlanets";

export class Asteroids extends Planet{
    constructor(){
        super();
        this._type = "asteroids";
        this._range = { start: { x: -100000, z: -100000 }, end: { x: -50000, z: -50000 } };
        this._gravity = 0.05;
        this._fuelMultiplier = 0.9;
    }
    launching(){}
}