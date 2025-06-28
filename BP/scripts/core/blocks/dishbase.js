import { world, system } from "@minecraft/server"

system.afterEvents.scriptEventReceive.subscribe(({id, sourceEntity:dishbase, message}) => {
    if (id != "cosmos:dishbase") return
    if (message == "despawn" ) {
        dishbase.kill()
        dishbase.remove()
    }
})

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("cosmos:dishbase", {
        beforeOnPlayerPlace(event){
            system.run(() => {
                const {dimension, block} = event
                let space = true
                for (let i = -4; i<5; i++) {
                    if (block.offset({x: i, y: 1, z: 0}).typeId != "minecraft:air") space = false
                    if (block.offset({x: i, y: 4, z: 0}).typeId != "minecraft:air") space = false
                }
                for (let i = -4; i<5; i++) {
                    if (block.offset({x: 0, y: 1, z: i}).typeId != "minecraft:air") space = false
                    if (block.offset({x: 0, y: 4, z: i}).typeId != "minecraft:air") space = false
                }
                if (!space) { event.cancel = true; return }
                const entity = dimension.spawnEntity("cosmos:dishbase", block.above().bottomCenter())
                entity.nameTag = "§d§i§s§h§b§a§s§e"
            });
        },
        onPlayerBreak({block, dimension}){
            const entities = dimension.getEntities({
                type: "cosmos:dishbase",
                location: block.above().center(),
                maxDistance: 0.5
            })
            entities?.forEach(entity => entity.runCommand(`scriptevent cosmos:dishbase despawn`))
        }
    })
})