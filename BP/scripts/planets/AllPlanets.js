import { Moon } from "./dimensions/Moon";
import { Mars } from "./dimensions/Mars";
import { Venus } from "./dimensions/Venus";
import { Asteroids } from "./dimensions/Asteroids";

export default [
    {
        id: 'moon',
        range: { start: { x: 50000, z: 50000 }, end: { x:100000, z: 100000 } },
        class: new Moon()
    },
    {
        id: 'mars',
        range: { start: { x: -100000, z: 50000 }, end: { x: -50000, z: 100000 } },
        class: new Mars()
    },
    {
        id: 'venus',
        range: { start: { x: 50000, z: -100000 }, end: { x: 100000, z: -50000 } },
        class: new Venus()
    },
    {
        id: 'asteroids',
        range: { start: { x: -100000, z: -100000 }, end: { x: -50000, z: -50000 } },
        class: new Asteroids()
    }
];