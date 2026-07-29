import { world, system, BlockVolume, BlockPermutation } from "@minecraft/server";
import { pads } from "../vehicles/Vehicle";

export function assemble(block, type) {
	for (let x of [-1, 0, 1]) {
		for (let z of [-1, 0, 1]) {
			const target = block.offset({x:x, y:0, z:z})
			if (target.typeId != type) return
			if (target.permutation.getState("cosmos:center")) return
		}
	} block.setPermutation(block.permutation.withState( 'cosmos:center', true))
}
export function destroy(block, type, player) {
	// disable tile drops if it was enabled and the player who broke the pad is in creative
	const no_drops = world.gameRules.doTileDrops && player.getGameMode() == 'Creative'
	if (no_drops) world.gameRules.doTileDrops = false
	// break the center pad
	const {x: cx, y: cy, z: cz, dimension} = block
	if (block.typeId == type) dimension.runCommand(`fill ${cx} ${cy} ${cz} ${cx} ${cy} ${cz} air destroy`)
	// break the rocket
	const entity = dimension.getEntities({location: block.center(), maxDistance: 1, families: [pads[type]]})[0]
	if (entity) entity.kill()
	// break the launch pad
	const is_center = { includePermutations: [BlockPermutation.resolve(type, {"cosmos:center": true})] }
	for (let x = cx -1, y = cy; x < cx + 2; x++) for (let z = cz - 1; z < cz + 2; z++) {
		const target = dimension.getBlock({x, y, z}) // get the block at the location
		if (target.typeId != type) continue // skip th block if its type doesn't match
		const volume = new BlockVolume({x: x -1, y, z: z -1}, {x: x +1, y, z: z +1}) // get the area around the block
		if (dimension.containsBlock(volume, is_center, true)) continue // skip if the area around it contains a center pad
		dimension.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air destroy`) // destroy the pad
	}
	// re-enable tile drops if it was disabled
	if (no_drops) world.gameRules.doTileDrops = true
}

export const components = {
	rocket_launch_pad: {
		onPlace({block}) {
			for (let x of [-1, 0, 1]) {
				for (let z of [-1, 0, 1]) {
					const target = block.offset({x:x, y:0, z:z})
					assemble(target, "cosmos:rocket_launch_pad")
				}
			}
		},
		onPlayerBreak({block, player, brokenBlockPermutation: pad}) {
			const pad_type = pad.type.id
			// if the center was broken destroy the launch pad
			if (pad.getState("cosmos:center")) destroy(block, pad_type, player)
			// find the center otherwise
			else for (let x = -1, y = 0; x < 2; x++) for (let z = -1; z < 2; z++) {
				const target = block.offset({x, y, z})
				const target_type = target.typeId
				if (target_type != pad_type) continue // skip other block types
				if (!target.permutation.getState("cosmos:center")) continue // skip if not center
				destroy(target, pad_type, player) // destroy the launch pad if center
			}
		}
	},
	buggy_fueling_pad: {
		onPlace({block}) {
			for (let x of [-1, 0, 1]) {
				for (let z of [-1, 0, 1]) {
					const target = block.offset({x:x, y:0, z:z})
					assemble(target, "cosmos:buggy_fueling_pad")
				}
			}
		},
		onPlayerBreak({block, player, brokenBlockPermutation: pad}) {
			const pad_type = pad.type.id
			// if the center was broken destroy the launch pad
			if (pad.getState("cosmos:center")) destroy(block, pad_type, player)
			// find the center otherwise
			else for (let x = -1, y = 0; x < 2; x++) for (let z = -1; z < 2; z++) {
				const target = block.offset({x, y, z})
				const target_type = target.typeId
				if (target_type != pad_type) continue // skip other block types
				if (!target.permutation.getState("cosmos:center")) continue // skip if not center
				destroy(target, pad_type, player) // destroy the launch pad if center
			}
		}
	},
	rocket_item: {
		onUseOn({block, source:player, usedOnBlockPermutation:pad, itemStack:item}) {
			if (block.typeId != "cosmos:rocket_launch_pad") return
			if (!pad.getState("cosmos:center")) return
			if (!["cosmos:rocket_tier_1_item", "cosmos:rocket_tier_2_item", "cosmos:rocket_tier_3_item"].includes(item.typeId)) return
			if (player.dimension.getEntities({ location: block.center(), maxDistance: 1 }).length) return

			const {x, y, z} = block.center()
			const equipment = player.getComponent("minecraft:equippable")
			let inventory_size = item.getDynamicProperty('inventory_size') || 0;
			let type = item.typeId.replace("_item", "")
			player.dimension.spawnEntity(type, {x: x, y: y - 0.3, z: z}, {spawnEvent: 'cosmos:inv' + inventory_size, initialRotation: 90})
			if (player.getGameMode() != "Creative") equipment.setEquipment("Mainhand", item.decrementStack())
		}
	},
	buggy_item: {
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
	}
}
