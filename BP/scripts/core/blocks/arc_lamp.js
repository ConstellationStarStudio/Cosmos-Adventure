import {system} from "@minecraft/server";

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('cosmos:arc_lamp', {
		onRedstoneUpdate({block, powerLevel}){
			if(powerLevel > 0) block.setPermutation(block.permutation.withState('cosmos:lamp_active', false))
			else{ block.setPermutation(block.permutation.withState('cosmos:lamp_active', true)) }
		},
	})
})