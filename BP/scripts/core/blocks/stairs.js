import { world, system } from "@minecraft/server";

function neighbors_stairs(block) {
	const perm = block.permutation
	const half = perm.getState("minecraft:vertical_half")
	return ["north", "east", "south", "west"].map(side => 
		block[side]()
	).map(stair =>
		(stair.permutation.hasTag('stairs') && stair.permutation.getState('minecraft:vertical_half') == half) ? stair :
		(stair.typeId.includes('stairs') && stair.permutation.getState('upside_down_bit') == (half == 'top')) ? stair :
		undefined
	).map(stair =>
		stair?.permutation.hasTag('stairs') ? stair.permutation.getState("minecraft:cardinal_direction") : stair ? ["east", "west", "south", "north"][stair.permutation.getState("weirdo_direction")] : undefined
	)
}

function set_corners(direction, [north, east, south, west]) {
	let [north_east, north_west, south_east, south_west] = [false, false, false, false]
	if (direction == 'north') {
		north_east = !(north == 'west')
		north_west = !(north == 'east')
		south_east = (south == 'east') && !['west', 'east'].includes(north)
		south_west = (south == 'west') && !['west', 'east'].includes(north)
	}
	if (direction == 'east') {
		north_east = !(east == 'south')
		north_west = (west == 'north') && !['north', 'south'].includes(east)
		south_east = !(east == 'north')
		south_west = (west == 'south') && !['north', 'south'].includes(east)
	}
	if (direction == 'south') {
		north_east = (north == 'east') && !['west', 'east'].includes(south)
		north_west = (north == 'west') && !['west', 'east'].includes(south)
		south_east = !(south == 'west')
		south_west = !(south == 'east')
	}
	if (direction == 'west') {
		north_east = (east == 'north') && !['north', 'south'].includes(west)
		north_west = !(west == 'south')
		south_east = (east == 'south') && !['north', 'south'].includes(west)
		south_west = !(west == 'north')
	}
	return [north_east, north_west, south_east, south_west]
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('cosmos:stairs', {
		beforeOnPlayerPlace(event) {
			system.run(() => {
				const perm = event.permutationToPlace
				const direction = perm.getState("minecraft:cardinal_direction")
				event.permutationToPlace = perm.withState(
					'generic:north_east', ["north", "east"].includes(direction)).withState(
					'generic:north_west', ["north", "west"].includes(direction)).withState(
					'generic:south_east', ["south", "east"].includes(direction)).withState(
					'generic:south_west', ["south", "west"].includes(direction)
				)
			});
		},
		onTick({block}) {
			const perm = block.permutation
			const direction = perm.getState("minecraft:cardinal_direction")

			const [north_east, north_west, south_east, south_west] = set_corners(direction, neighbors_stairs(block))
			if (!block.hasTag("stairs")) return
			block.setPermutation(perm.withState(
				'generic:north_east', north_east).withState(
				'generic:north_west', north_west).withState(
				'generic:south_east', south_east).withState(
				'generic:south_west', south_west
			))
		}
	});
});
