import { world, system } from "@minecraft/server";
import { assemble, destroy } from "./rocket_launch_pad";

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('cosmos:buggy_fueling_pad', {
		onPlace({block}) {
			for (let x of [-1, 0, 1]) {
				for (let z of [-1, 0, 1]) {
					const target = block.offset({x:x, y:0, z:z})
					assemble(target, "cosmos:buggy_fueling_pad")
				}
			}
		},
		onPlayerBreak({block, player, brokenBlockPermutation: pad}) {
			if (pad.getState("cosmos:center")) {
				destroy(block, pad.type.id); return
			}
			for (let x of [-1, 0, 1]) {
				for (let z of [-1, 0, 1]) {
					const target = block.offset({x: x, y: 0, z: z})
					if (target.typeId != "cosmos:buggy_fueling_pad") continue
					if (target.permutation.getState("cosmos:center")) {
						if (player.getGameMode() == 'Creative') world.gameRules.doTileDrops = false
						destroy(target, pad.type.id)
						world.gameRules.doTileDrops = true; return
					}
				}
			}
		}
	})
})

system.beforeEvents.startup.subscribe(({itemComponentRegistry}) => {
    itemComponentRegistry.registerCustomComponent("cosmos:buggy", {
        onUseOn({block, source:player, usedOnBlockPermutation:pad, itemStack:item}) {
			if (block.typeId != "cosmos:buggy_fueling_pad") return
			if (!pad.getState("cosmos:center")) return
			if (item.typeId != "cosmos:moon_buggy_item") return
			if (player.dimension.getEntities({ location: block.center(), maxDistance: 1 }).length) return

			const {x, y, z} = block.center()
			const equipment = player.getComponent("minecraft:equippable")
			let inventory_size = item.getDynamicProperty('inventory_size') || 0;
			let buggy = player.dimension.spawnEntity("cosmos:moon_buggy", {x: x, y: y + 2.5, z: z}, 
				{spawnEvent: 'cosmos:inv' + inventory_size})
			buggy.setProperty("cosmos:container_number", inventory_size/18)
			if (player.getGameMode() != "Creative") equipment.setEquipment("Mainhand", item.decrementStack())
        }
    })
})
