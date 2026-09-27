import OxygenUtil from "../../api/world/OxygenUtils";

// Java: TileEntityOxygenDetector — checks every 50 ticks for breathable air
// and updates the block state to emit/stop redstone.

export const oxygen_detector_component = {
	onTick({ block }) {
		const { x, y, z } = block.location;
		const aabb = {
			min: { x: x - 0.6, y: y - 0.6, z: z - 0.6 },
			max: { x: x + 1.6, y: y + 1.6, z: z + 1.6 }
		};

		const oxygenFound = OxygenUtil.isAABBInBreathableAirBlockWorld(aabb, false);

		const currentActive = block.permutation.getState('cosmos:active');
		if (oxygenFound !== currentActive) {
			block.setPermutation(block.permutation.withState('cosmos:active', oxygenFound));
		}
	}
};
