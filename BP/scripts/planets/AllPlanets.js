import { Moon } from "./dimensions/Moon.js";
import { Mars } from "./dimensions/Mars.js";
import { Venus } from "./dimensions/Venus.js";
import { Asteroids } from "./dimensions/Asteroids.js";
import { SpaceStations } from "./dimensions/SpaceStations.js";

const FULL_RANGE = {
    start: { x: -30000000, z: -30000000 },
    end: { x: 30000000, z: 30000000 }
};

export default [
    {
        id: 'moon',
        dimensionId: 'cosmos:moon',
        range: FULL_RANGE,
        class: new Moon()
    },
    {
        id: 'mars',
        dimensionId: 'cosmos:mars',
        range: FULL_RANGE,
        class: new Mars()
    },
    {
        id: 'venus',
        dimensionId: 'cosmos:venus',
        range: FULL_RANGE,
        class: new Venus()
    },
    {
        id: 'asteroids',
        dimensionId: 'cosmos:asteroids',
        range: FULL_RANGE,
        class: new Asteroids()
    },
    {
        id: 'stations',
        dimensionId: 'cosmos:space_stations',
        range: FULL_RANGE,
        class: new SpaceStations()
    }
];