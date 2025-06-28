import { world, BlockPermutation, system } from "@minecraft/server"

const faces = ["cosmos:up", "cosmos:north", "cosmos:east", "cosmos:west", "cosmos:south", "cosmos:down"]

const dyes = {
	"minecraft:white_dye": "white",
	"minecraft:light_gray_dye": "silver",
	"minecraft:gray_dye": "gray",
	"minecraft:black_dye": "black",
	"minecraft:brown_dye": "brown",
	"minecraft:red_dye": "red",
	"minecraft:orange_dye": "orange",
	"minecraft:yellow_dye": "yellow",
	"minecraft:lime_dye": "lime",
	"minecraft:green_dye": "green",
	"minecraft:light_blue_dye": "light_blue",
	"minecraft:cyan_dye": "cyan",
	"minecraft:blue_dye": "blue",
	"minecraft:purple_dye": "purple",
	"minecraft:magenta_dye": "magenta",
	"minecraft:pink_dye": "pink",
}

export function attach_pipes(block, attach = true) {
	const neighbors = block.getNeighbors(6)
	for (const [i, pipe] of neighbors.entries()) {
		if ('cosmos:fluid_pipe' == pipe.typeId) 
			pipe.setPermutation(pipe.permutation.withState(faces[5 - i], attach))
	}
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('cosmos:fluid_pipe', {
		beforeOnPlayerPlace(event) {
			system.run(() => {
				const { block } = event;
				const neighbors = block.getNeighbors(6);
				const connections = block.permutation.getAllStates()
				for (const [i, pipe] of neighbors.entries()) {
					connections[faces[i]] = false
					if (['cosmos:fluid_pipe', 'cosmos:fluid_tank'].includes(pipe.typeId)) {
						const side_connections = pipe.permutation.getAllStates()
						side_connections[faces[5 - i]] = true
						if ('cosmos:fluid_pipe' == pipe.typeId) pipe.setPermutation(BlockPermutation.resolve("cosmos:fluid_pipe", side_connections))
						connections[faces[i]] = true
					}
				} event.permutationToPlace = BlockPermutation.resolve("cosmos:fluid_pipe", connections)
			});
		},
		onPlayerBreak({block}) {
			const neighbors = block.getNeighbors(6)
			for (const [i, pipe] of neighbors.entries()) {
				if ('cosmos:fluid_pipe' == pipe.typeId) 
					pipe.setPermutation(pipe.permutation.withState(faces[5 - i], false))
			}
		},
		onPlayerInteract({player, block}) {
			const equipment = player.getComponent("minecraft:equippable")
			const item = equipment.getEquipment("Mainhand")?.typeId
			const pipe = block.permutation
			if (item == "cosmos:standard_wrench") {
				const neighbors = block.getNeighbors(6).map(tank => tank.typeId)
				if (neighbors.includes("cosmos:fluid_tank")) {
	  				block.setPermutation(pipe.withState(`cosmos:pull`, !pipe.getState(`cosmos:pull`)))
				}
			}
			if (Object.keys(dyes).includes(item) && pipe.getState('cosmos:color') != dyes[item]) {
				block.setPermutation(pipe.withState('cosmos:color', dyes[item]))
				player.runCommand(`clear @s ${item} 0 1`)
			}
		}
	})
})