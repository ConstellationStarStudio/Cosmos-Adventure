import { world, system } from "@minecraft/server";

/**
 * @typedef {Object} BlockUpdateRegistration
 * @property {(block: import("@minecraft/server").Block) => boolean} check - A function that returns true if the block should be updated.
 * @property {(block: import("@minecraft/server").Block) => void} update - The function to call to update the block.
 */

/**
 * A registry of functions to call when a block's neighbor is updated.
 * @type {BlockUpdateRegistration[]}
 */
const blockUpdateRegistry = [];

/**
 * Registers a component's update logic to be triggered by neighbor updates.
 * @param {BlockUpdateRegistration} registration - The registration object.
 */
export function registerForBlockUpdates(registration) {
    blockUpdateRegistry.push(registration);
}

/**
 * This function is the core of the block update system.
 * It checks all neighbors of a given block and, if they match a registered checker,
 * it triggers their specific update function.
 *
 * @param {import("@minecraft/server").Block} block The block whose neighbors should be updated.
 */
function updateNeighboringBlocks(block) {
    if (!block || !block.dimension) return;

    const neighbors = [
        block.north(),
        block.south(),
        block.east(),
        block.west(),
        block.above(),
        block.below()
    ];

    for (const neighbor of neighbors) {
        if (!neighbor) continue;

        // Check the registry to see if this neighbor block needs an update.
        for (const registration of blockUpdateRegistry) {
            if (registration.check(neighbor)) {
                registration.update(neighbor);
            }
        }
    }
}

// --- Event Subscriptions ---
// Listen to events that cause block changes without direct player interaction.

world.afterEvents.pistonActivate.subscribe(event => {
    const { piston, dimension } = event;
    system.run(() => {
        for (const location of piston.getAttachedBlocks()) {
            const block = dimension.getBlock(location);
            if (block) {
                updateNeighboringBlocks(block);
            }
        }
    });
});

world.afterEvents.explosion.subscribe(event => {
    const { dimension } = event;
    for (const location of event.getImpactedBlocks()) {
        const block = dimension.getBlock(location); // This is now an air block
        if (block) {
            updateNeighboringBlocks(block);
        }
    }
});


