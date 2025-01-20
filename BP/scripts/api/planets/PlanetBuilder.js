
import { world, BlockVolume } from "@minecraft/server"

const the_end = world.getDimension('the_end')

function chunk_corner({x, z}) {
    return {
        x: Math.floor(x / 16) * 16,
        z: Math.floor(z / 16) * 16,
    }
}

//this removes the small end islands, shulkers, gateways and chorus plants
world.beforeEvents.worldInitialize.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('cosmos:end_cleaner', {
        onTick({block}) {
            const {x, z} = chunk_corner(block.location)
            const first_corner = {x, y: 10, z}
            const other_corner = {x: x + 15, y: 120, z: z + 15} 
            the_end.fillBlocks(new BlockVolume(first_corner, other_corner), 'air', {
                blockFilter: {includeTypes: ['end_stone', 'bedrock', 'end_gateway', 'chorus_plant', 'chorus_flower', 'cosmos:end_cleaner']}
            })
            const shulkers = the_end.getEntities({
                location: first_corner,
                volume: {x: 16, y: 210, z: 16},
                type: "minecraft:shulker",
            })
            shulkers.forEach(shulker=> shulker.remove())
        }
    })
})