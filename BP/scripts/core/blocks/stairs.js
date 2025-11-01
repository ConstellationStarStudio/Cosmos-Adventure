import { system, BlockPermutation } from "@minecraft/server";
import { registerForBlockUpdates } from "../../api/libraries/BlockUpdate.js";
import { registerPlaceHandler, registerBreakHandler } from "../../api/event_manager.js";
import { trackBlock, untrackBlock } from "../../api/destruction_handler.js";

const type = "cosmos:type";
const tag = "cosmos:stairs";
const blocker = "cosmos:stairs_collision";

/**
 * Triggers an update for any neighboring blocks that are custom stairs.
 * @param {import("@minecraft/server").Block} block The block whose neighbors need updating.
 */
function updateNeighbors(block) {
	const neighbors = [
		block.north(),
		block.south(),
		block.east(),
		block.west(),
		block.above(),
		block.below()
	];

	for (const neighbor of neighbors) {
		// We only ever want to update our custom stairs.
		if (neighbor?.hasTag(tag)) {
			system.run(() => updateStair(neighbor));
		}
	}
}

function updateBlocker(block) {
	const above = block.above();
	const below = block.below();
	if (above?.typeId === blocker && above.permutation.getState("minecraft:vertical_half") === "bottom") {
		above.setPermutation(BlockPermutation.resolve("minecraft:air"));
	} else if (below?.typeId === blocker && below.permutation.getState("minecraft:vertical_half") === "top") {
		below.setPermutation(BlockPermutation.resolve("minecraft:air"));
	}
}

function updateStair(block) {
	if (!block || !block.isValid || !block.hasTag(tag)) return;

	try {
		updateBlocker(block);

		const north = block.north();
		const south = block.south();
		const east = block.east();
		const west = block.west();
		const above = block.above();

		const direction = block.permutation.getState("minecraft:cardinal_direction");
		const stairHalf = block.permutation.getState("minecraft:vertical_half");

		const getStairShape = (neighbor) => {
			if (!neighbor || !neighbor.isValid || !neighbor.typeId || !neighbor.permutation) return { half: undefined, direction: undefined };

			if (neighbor.hasTag(tag)) { // It's a custom stair
				return {
					half: neighbor.permutation.getState("minecraft:vertical_half"),
					direction: neighbor.permutation.getState("minecraft:cardinal_direction")
				};
			} else if (neighbor.typeId.includes("minecraft:") && neighbor.typeId.includes("stairs")) { // It's a vanilla stair
				const upsideDown = neighbor.permutation.getState("upside_down_bit");
				const directionValue = neighbor.permutation.getState("weirdo_direction");

				const half = upsideDown ? "top" : "bottom";
				let direction;

				switch (directionValue) {
					case 0:
						direction = "east";
						break;
					case 1:
						direction = "west";
						break;
					case 2:
						direction = "south";
						break;
					case 3:
						direction = "north";
						break;
				}

				return { half, direction };
			}

			return { half: undefined, direction: undefined };
		};

		const validNeighbor = (neighbor, dir) => {
			const shape = getStairShape(neighbor);
			return shape.half === stairHalf && shape.direction === dir;
		};

		let toPlace = 1;

		if (direction === "north") {
			if (validNeighbor(north, "west")) toPlace = 4;
			else if (validNeighbor(north, "east")) toPlace = 5;
			else if (validNeighbor(south, "west")) toPlace = 2;
			else if (validNeighbor(south, "east")) toPlace = 3;
		} else if (direction === "south") {
			if (validNeighbor(north, "west")) toPlace = 3;
			else if (validNeighbor(north, "east")) toPlace = 2;
			else if (validNeighbor(south, "west")) toPlace = 4;
			else if (validNeighbor(south, "east")) toPlace = 5;
		} else if (direction === "west") {
			if (validNeighbor(west, "north")) toPlace = 5;
			else if (validNeighbor(west, "south")) toPlace = 4;
			else if (validNeighbor(east, "north")) toPlace = 3;
			else if (validNeighbor(east, "south")) toPlace = 2;
		} else if (direction === "east") {
			if (validNeighbor(west, "north")) toPlace = 2;
			else if (validNeighbor(west, "south")) toPlace = 3;
			else if (validNeighbor(east, "north")) toPlace = 5;
			else if (validNeighbor(east, "south")) toPlace = 4;
		}

		block.setPermutation(block.permutation.withState(type, toPlace));

		const target = stairHalf === "bottom" ? above : block.below();
		if (target && (target.isAir || target.typeId === "minecraft:water" || target.typeId.includes("piston_arm"))) {
			let directionState = direction;
			if (toPlace === 4) {
				if (direction === "north") directionState = "west";
				else if (direction === "west") directionState = "south";
				else if (direction === "south") directionState = "west";
				else if (direction === "east") directionState = "south";
			} else if (toPlace === 5) {
				if (direction === "south") directionState = "east";
				else if (direction === "east") directionState = "north";
				else if (direction === "north") directionState = "east";
				else if (direction === "west") directionState = "north";
			}

			target.setPermutation(BlockPermutation.resolve(blocker)
				.withState("minecraft:cardinal_direction", directionState)
				.withState("minecraft:vertical_half", stairHalf)
				.withState("cosmos:corner", toPlace > 3)
			);
			trackBlock(target);
		}
	} catch (e) {
		console.error(`Error updating stair at ${block.location.x}, ${block.location.y}, ${block.location.z}: ${e}`);
	}
}


    registerForBlockUpdates({
        check: (block) => block && block.hasTag(tag),
        update: updateStair
    });

    registerPlaceHandler({
        check: (block) => block.hasTag(tag) || block.north()?.hasTag(tag) || block.south()?.hasTag(tag) || block.east()?.hasTag(tag) || block.west()?.hasTag(tag) || block.above()?.hasTag(tag) || block.below()?.hasTag(tag),
        execute: (event) => {
            const { block } = event;
            const blockBelow = block.below();

            // When a block is placed, update the block itself if it's a stair, and its neighbors.
            if (block.hasTag(tag)) {
                system.run(() => updateStair(block));
            }
            
            if (block.hasTag(tag) && blockBelow?.hasTag(tag)) {
                // Allow placing stairs on top of each other
            } else {
                updateNeighbors(block);
            }
        }
    });

    registerBreakHandler({
        event: "before",
        check: (block) => block.hasTag(tag),
        execute: (event) => {
            const { block, dimension } = event;
            if (!block || !block.isValid) return;

            const { x, y, z } = block.location;

            // "before" logic
            system.run(() => {
                const above = block.above();
                const below = block.below();
                
                if (above?.typeId === blocker) {
                    untrackBlock(above.location);
                    above.setPermutation(BlockPermutation.resolve("minecraft:air"));
                }
                
                if (below?.typeId === blocker) {
                    untrackBlock(below.location);
                    below.setPermutation(BlockPermutation.resolve("minecraft:air"));
                }
            });

            // "after" logic, delayed
            system.run(() => {
                const north = dimension.getBlock({x: x, y: y, z: z - 1});
                const south = dimension.getBlock({x: x, y: y, z: z + 1});
                const east = dimension.getBlock({x: x + 1, y: y, z: z});
                const west = dimension.getBlock({x: x - 1, y: y, z: z});
                const aboveBlock = dimension.getBlock({x: x, y: y + 1, z: z});
                const belowBlock = dimension.getBlock({x: x, y: y - 1, z: z});

                const neighbors = [north, south, east, west, aboveBlock, belowBlock];
                if (neighbors.some(b => b && b.hasTag(tag))) {
                    if (north?.hasTag(tag)) system.run(() => updateStair(north));
                    if (south?.hasTag(tag)) system.run(() => updateStair(south));
                    if (east?.hasTag(tag)) system.run(() => updateStair(east));
                    if (west?.hasTag(tag)) system.run(() => updateStair(west));
                    if (aboveBlock?.hasTag(tag)) system.run(() => updateStair(aboveBlock));
                    if (belowBlock?.hasTag(tag)) system.run(() => updateStair(belowBlock));

                    updateBlocker(dimension.getBlock(block.location));
                }
            });
        }
    });