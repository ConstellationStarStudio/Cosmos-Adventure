import { world, system} from "@minecraft/server";

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('cosmos:wall', {
		beforeOnPlayerPlace(event) {
			system.run(() => {
				const { block, permutationToPlace:perm } = event
				const [north, east, south, west] = ['north', 'east', 'south', 'west']
				.map(side => block[side]().hasTag('wall'))
				event.permutationToPlace = perm
				.withState('generic:north_wall', north)
				.withState('generic:east_wall', east)
				.withState('generic:south_wall', south)
				.withState('generic:west_wall', west)
			});
		},
		onTick({block}) {
			const perm = block.permutation

			const [north, east, south, west] = ['north', 'east', 'south', 'west']
			.map(side => block[side]().hasTag('wall'))
			block.setPermutation(perm
  			.withState('generic:north_wall', north)
  			.withState('generic:east_wall', east)
  			.withState('generic:south_wall', south)
  			.withState('generic:west_wall', west)
			)
		}
	});
});
