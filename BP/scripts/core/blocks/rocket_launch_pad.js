import { ItemStack, world, system } from "@minecraft/server";
import { pads, get_vehicle_item} from "../vehicles/Vehicle";

export function assemble(block, type) {
	for (let x of [-1, 0, 1]) {
		for (let z of [-1, 0, 1]) {
			const target = block.offset({x:x, y:0, z:z})
			if (target.typeId != type) return
			if (target.permutation.getState("cosmos:center")) return
		}
	} block.setPermutation(block.permutation.withState( 'cosmos:center', true))
}
export function destroy(block, type) {
	const dimension = block.dimension;
	const vehicle = dimension.getEntities({location: block.center(), maxDistance: 1, families: [pads[type]]})[0]
	if (vehicle) {
		const item = get_vehicle_item(vehicle, vehicle.getComponent("minecraft:inventory"));
		vehicle.remove();
		dimension.spawnItem(item, block.center());
	}
	for (let i of [-1, 0, 1]) {
		for (let j of [-1, 0, 1]) {
			const target = block.offset({x:i, y:0, z:j})
			if (target.typeId == type) {
				const {x, y, z} = target
				dimension.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air destroy`)
			}
		}
	}
}
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('cosmos:rocket_launch_pad', {
		onPlace({block}) {
			for (let x of [-1, 0, 1]) {
				for (let z of [-1, 0, 1]) {
					const target = block.offset({x:x, y:0, z:z})
					assemble(target, "cosmos:rocket_launch_pad")
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
					if (target.typeId != "cosmos:rocket_launch_pad") continue
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
    itemComponentRegistry.registerCustomComponent("cosmos:rocket", {
        onUseOn({block, source:player, usedOnBlockPermutation:pad, itemStack:item}) {
			if (block.typeId != "cosmos:rocket_launch_pad") return
			if (!pad.getState("cosmos:center")) return
			if (!["cosmos:rocket_tier_1_item", "cosmos:rocket_tier_2_item"].includes(item.typeId)) return
			if (player.dimension.getEntities({ location: block.center(), maxDistance: 1 }).length) return

			const {x, y, z} = block.center()
			const equipment = player.getComponent("minecraft:equippable")
			let inventory_size = item.getDynamicProperty('inventory_size') || 0;
			let type = item.typeId.replace("_item", "")
			player.dimension.spawnEntity(type, {x: x, y: y - 0.3, z: z}, {spawnEvent: 'cosmos:inv' + inventory_size, initialRotation: 90})
			if (player.getGameMode() != "Creative") equipment.setEquipment("Mainhand", item.decrementStack())
        }
    })
})
