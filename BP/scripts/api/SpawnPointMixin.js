import * as mc from "@minecraft/server";


//@ts-expect-error
Merge(mc.Player.prototype, {

    setSpawnPoint(dimensionLocation) {
        if (!dimensionLocation) return super.setSpawnPoint();
        if (dimensionLocation.dimension?.id === "minecraft:the_end") {
            // Save the spawn point Vector3
            this.setDynamicProperty("customSpawnPoint", dimensionLocation);

            // Force teleport the player to the location in the End.
            this.teleport(dimensionLocation, dimensionLocation);
        } else if (!dimensionLocation.dimension){
            dimensionLocation.dimension = this.dimension;
        }
        // For non-End dimensions, call the original method.
        super.setSpawnPoint(dimensionLocation);
    },

    getSpawnPoint(dimensionId) {
        if (!dimensionId?.includes("the_end")) return super.getSpawnPoint();
        // Retreive the Vector3
        let dimensionLocation = this.getDynamicProperty("customSpawnPoint");
        return dimensionLocation && { ...dimensionLocation, dimension: mc.world.getDimension("the_end") };
    }

});


// Listen for player respawn events.
mc.world.afterEvents.playerSpawn.subscribe(eventData => {
    //return when player joined the world
    if (eventData.initialSpawn) return;
    // Retrieve the custom spawn point saved as a dynamic property.
    let spawnLocationDimension = eventData.player.getSpawnPoint("the_end");
    if (!spawnLocationDimension) return;
    // Teleport the player to the saved spawn location in the End.
    eventData.player.teleport(spawnLocationDimension, spawnLocationDimension);
});


// Listen for player death events.
mc.world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
    // Retrieve the custom spawn point saved as a dynamic property.
    let spawnLocationDimension = deadEntity.getSpawnPoint("the_end");
    if (!spawnLocationDimension) return;
    if (!spawnLocationDimension.dimension
        .getBlockFromRay(spawnLocationDimension, { x: 0, y: -1, z: 0 })
        ?.block) {
        deadEntity.setSpawnPoint(); // Reset the player's spawnpont
    }
}, { entityTypes: ["minecraft:player"] });


export { }
