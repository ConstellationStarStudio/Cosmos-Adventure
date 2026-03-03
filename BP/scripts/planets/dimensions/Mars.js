import { world, system } from "@minecraft/server";
import { Planet } from "../../planets/GalacticraftPlanets";

export class Mars extends Planet{
    constructor(){
        super();
        this._type = "mars";
        this._range = { start: { x: -100000, z: 50000 }, end: { x: -50000, z: 100000 } };
        this._gravity =  3.7;
        this._center = {x: -75000, z: 75000}
    }
    launching(player, data, loaded = false){
        let loc = { x: this._center.x + (Math.random() * 20), y: 1000, z: this._center.z + (Math.random() * 20) };
        player.teleport(loc, { dimension: world.getDimension("the_end")});
    }
}