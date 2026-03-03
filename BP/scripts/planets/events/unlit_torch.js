import { world, BlockPermutation } from "@minecraft/server";

world.afterEvents.playerPlaceBlock.subscribe(({block}) => {
    if(block.typeId == "minecraft:torch"){
        let planet = block.getPlanet();
        if(!planet) return;
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