import * as mc from "@minecraft/server";


// Listen for player respawn events.
mc.world.afterEvents.playerSpawn.subscribe(eventData => {
  //return when player joined the world
  if (eventData.initialSpawn) return;
  const player = eventData.player;
  // Retrieve the custom spawn point saved as a dynamic property.
  let spawnLocationDimension = player.getSpawnPoint("the_end");

  if (!spawnLocationDimension) return;

  // Teleport the player to the saved spawn location in the End.
  player.teleport(spawnLocationDimension, spawnLocationDimension);

});



// Listen for player respawn events.
mc.world.afterEvents.entityDie.subscribe(({ deadEntity: player }) => {
  //return when player joined the world
  mc.world.sendMessage(player.typeId);


  // Retrieve the custom spawn point saved as a dynamic property.
  let spawnLocationDimension = player.getSpawnPoint("the_end");

  if (!spawnLocationDimension) return;
  if (!spawnLocationDimension.dimension
    .getBlockFromRay(spawnLocationDimension, { x: 0, y: -1, z: 0 })
    ?.block) {
      mc.world.sendMessage("§cwruieyfdjhkxjkdsdlhgjc")
    player.setSpawnPoint()
  }

}, { entityTypes: ["minecraft:player"] });


export { }
