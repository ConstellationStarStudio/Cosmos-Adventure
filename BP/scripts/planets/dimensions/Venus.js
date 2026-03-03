import { world, system } from "@minecraft/server";
import { Planet } from "../../planets/GalacticraftPlanets";

export class Venus extends Planet{
    constructor(){
        super();
        this._type = "venus";
        this._range = { start: { x: 50000, z: -100000 }, end: { x: 100000, z: -50000 } },
        this._gravity = 8.87;
    }
    launching(){}
}