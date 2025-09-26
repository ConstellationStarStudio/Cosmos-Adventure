import { Player, Entity, world, ScreenDisplay, system, BlockPermutation } from "@minecraft/server";
export { Planet };


let ALL_PLANETS = {}
/**
 * Class representing a generic Planet
 */
class Planet {
    /**
     * Creates an instance of a Planet
     * @param {Object} options - Options for the planet
     * @param {string} options.type - ID of the planet
     * @param {Object} options.range - Range of the planet
     * @param {Number} options.gravity - Gravity of the planet
     */
    constructor({ type, range, gravity }) {
        this.#type = type;
        this.#range = range;
        this.#center = {
            x: (this.range.start.x + this.range.end.x) / 2,
            z: (this.range.start.z + this.range.end.z) / 2
        };
        this.#gravity = gravity;
    }

    #range
    #type
    #center
    #gravity

    //Gets the type of the planet
    get type() {
        return this.#type + '';
    }

    //Gets the range of the planet
    get range() {
        return {
            start: { x: this.#range.start.x, z: this.#range.start.z },
            end: { x: this.#range.end.x, z: this.#range.end.z }
        };
    }

    //Gets the center coordinates of the planet
    get center() {
        return {
            x: this.#center.x,
            z: this.#center.z
        };
    }

    //Gets the gravity of the planet
    get gravity() {
        return this.#gravity + 0;
    }

    //Checks whether a given location is on the planet
    isOnPlanet(location) {
        return (
            this.range.start.x <= location.x && location.x <= this.range.end.x &&
            this.range.start.z <= location.z && location.z <= this.range.end.z
        );
    }
    static getPlanetOfObject(object) {
        return object.dimension.id == "minecraft:the_end" ? Planet.getAll().find(pl => pl.isOnPlanet(object.location)): undefined;
    }

    //Gets all entities in the End that match the EntityQueryOptions
    getEntities(entityQueryOptions = {}) {
        const the_end = world.getDimension('the_end');
        return the_end.getEntities(entityQueryOptions).filter(entity => 
            this.isOnPlanet(entity.location)
        );
    }

    //Gets all players on the planet that match the EntityQueryOptions
    getPlayers(entityQueryOptions = {}) {
        const the_end = world.getDimension('the_end');
        return the_end.getPlayers(entityQueryOptions).filter(entity => 
            this.isOnPlanet(entity.location)
        );
    }

    //Offsets the given location relative to the planet's center
    offset(location) {
        return {
            x: location.x - this.center.x,
            y: location.y, 
            z: location.z - this.center.z
        };
    }

    /**
     * Registers a new planet with the given ID and options
     * @param {string} id - The ID of the planet to register
     * @param {Object} options - Options for the planet
     * @throws {Error} Throws an error if a planet with the same ID is already registered
     */
    static register(id, options) {
        if (Planet.get(id) !== undefined) throw new Error('Planet with id "' + id + '" is already registered');
        options = {
            range: options.range || { start: { x: -1, z: -1 }, end: { x: 1, z: 1 } },
            gravity: options.gravity || 9.8
        };
        ALL_PLANETS[id] = new Planet({ type: id, range: options.range, gravity: options.gravity });
        return Planet.get(id)
    }

    //Returns a registered planet by its ID
    static get(id) {
        return ALL_PLANETS[id];
    }

    //Returns all registered planets
    static getAll() {
        return Object.keys(ALL_PLANETS).map(id => this.get(id));
    }
}
// Coordinate display

// Returns the coordinates that should be displayed on the screen
function planet_coords(entity) {
    const the_end = world.getDimension('the_end');
  if (entity.dimension.id != 'minecraft:the_end') return entity.location;
  let planet = Planet.getAll().find(pl => pl.isOnPlanet(entity.location))
  return planet?.offset(entity.location) || entity.location
}
export function coords_loop(player){
    let {x, y, z} = planet_coords(player)
    x = Math.floor(x)
    y = Math.floor(y + 0.000001)
    z = Math.floor(z)
    player.onScreenDisplay.setActionBar(`Position: ${x}, ${y}, ${z}`)
}
world.afterEvents.gameRuleChange.subscribe(({rule, value}) => {
    if (rule == "showCoordinates" && value == false)
        world.getAllPlayers().forEach(player =>
            player.onScreenDisplay.setActionBar(`§.`)
        )
    }
)

//unlit torch
world.afterEvents.playerPlaceBlock.subscribe((data) => {
    let block = data.block;
    if(block.typeId == "minecraft:torch"  && block.dimension.id == "minecraft:the_end"){
        if(!Planet.getPlanetOfObject(block)) return;
        let opposite_side = {
            "north": "south",
            "south": "north",
            "east": "west", 
            "west": "east",
            "top": "up"
        }
        let state = block.permutation.getState("torch_facing_direction");
        block.setPermutation(BlockPermutation.resolve("cosmos:unlit_torch", {"minecraft:block_face": opposite_side[state]}));
    }
});

/**
 * @typedef {import("@minecraft/server").Vector3} Vec3
 * @typedef {import("@minecraft/server").EntityQueryOptions} EntityQueryOptions
 */