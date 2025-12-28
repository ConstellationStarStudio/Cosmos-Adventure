import { system } from "@minecraft/server";

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent('cosmos:fallen_meteor', {
        onTick({block, dimension}){
            if(system.currentTick % 5000 == 0 && block.permutation.getState("cosmos:heat_level") == 1){
                block.setPermutation(block.permutation.withState("cosmos:heat_level", 0));
            }
            if(system.currentTick % 5 == 0 && block.permutation.getState("cosmos:heat_level")){
                let {x, y, z} = block.center();
                let burned_entity = dimension.getEntities({location: block.center(), maxDistance: 1})[0]
                if(!burned_entity) return;
                burned_entity.setOnFire(2, true);
                dimension.playSound("fire.fire", {x: x, y: y, z: z})
                for(let i = 0; i < 8; i++){
                    dimension.spawnParticle('minecraft:basic_smoke_particle', {x: x + Math.random(), y: y + 0.2, z: z + Math.random()})
                }
                
                let direction_x =  x + 0.5 - burned_entity.location.x;
                let direction_z;

                for (direction_z = burned_entity.location.z - z; direction_x * direction_x + direction_z * direction_z < 0.0001; direction_z = (Math.random() - Math.random()) * 0.01)
                {
                    direction_x = (Math.random() - Math.random()) * 0.01;
                }
                try{burned_entity.applyKnockback({x: direction_x, z: direction_z}, 1)}catch{}
            }
        }
    })
})