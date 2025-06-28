import { world, system, Block, Dimension } from "@minecraft/server";
export { BlockUpdate };

/**
 * @typedef {Object} Offset
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * Map of registered block update event callbacks.
 * @type {Object.<string, (update: BlockUpdate) => void>}
 */
const Events = {};

/** @type {Offset[]} */
const Offsets = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 }
];

let LastEventId = -1;

/**
 * Class representing a block update event.
 */
class BlockUpdate {
  /** @type {Block} */
  #block;
  /** @type {Block|undefined} */
  #source;

  /**
   * Creates a BlockUpdate instance.
   * @param {{ block: Block, source?: Block }} data - Data for the block update.
   */
  constructor(data) {
    this.#block = data.block;
    this.#source = data.source;
  }

  /**
   * Gets the block that was updated.
   * @returns {Block} The updated block.
   */
  get block() {
    return this.#block;
  }

  /**
   * Gets the block that triggered the update.
   * @returns {Block|undefined} The source block or undefined if not applicable.
   */
  get source() {
    return this.#source;
  }

  /**
   * Registers a callback to listen for block updates.
   * @param {(update: BlockUpdate) => void} callback - Callback function receiving a block update.
   * @returns {string} Listener ID for later removal.
   */
  static on(callback) {
    LastEventId++;
    const id = LastEventId + "";
    Events[id] = callback;
    return id;
  }

  /**
   * Removes a registered block update listener.
   * @param {string} id - The listener ID returned by BlockUpdate.on.
   */
  static off(id) {
    delete Events[id];
  }

  /**
   * Triggers block update events on all neighboring blocks of the given source block.
   * @param {Block} source - The source block triggering the update.
   */
  static trigger(source) {
    for (const offset of Offsets) {
      let block;
      try {
        block = source.offset(offset);
      } catch {
        // Ignored: offset() might throw for invalid positions.
      }
      if (block !== undefined) {
        BlockUpdate.triggerEvents({ block, source });
      }
    }
  }

  /**
   * Creates a BlockUpdate instance and calls all registered callbacks.
   * @param {{ block: Block, source?: Block }} data - Data for the block update.
   */
  static triggerEvents(data) {
    const update = new BlockUpdate(data);
    Object.values(Events).forEach((callback) => callback(update));
  }
}

/**
 * Fnction to trigger block update events using the block from the event data.
 * @param {{ block: Block }} data - Event data containing a block.
 */
const easyTrigger = (data) => BlockUpdate.trigger(data.block);

// Subscribe to various world events to trigger block update events.
world.beforeEvents.playerInteractWithBlock.subscribe((data) => {
  if (!data.isFirstEvent) return;
  system.run(() => {
    if (!data.block.isValid || data.cancel) return;
    BlockUpdate.trigger(data.block);
  });
});
world.afterEvents.playerBreakBlock.subscribe(easyTrigger);
world.afterEvents.buttonPush.subscribe(easyTrigger);
world.afterEvents.leverAction.subscribe(easyTrigger);
world.afterEvents.pistonActivate.subscribe(easyTrigger);
world.afterEvents.playerPlaceBlock.subscribe(easyTrigger);
world.afterEvents.pressurePlatePop.subscribe(easyTrigger);
world.afterEvents.pressurePlatePush.subscribe(easyTrigger);
world.afterEvents.tripWireTrip.subscribe(easyTrigger);
world.afterEvents.projectileHitBlock.subscribe((data) => {
  BlockUpdate.trigger(data.getBlockHit().block);
});

world.afterEvents.explosion.subscribe((data) => {
  // Create a shallow copy of the impacted blocks array.
  const triggeredBlocks = data.getImpactedBlocks().slice();
  const initialLength = triggeredBlocks.length;

  // Trigger events for each initially impacted block.
  for (let i = 0; i < initialLength; i++) {
    const source = triggeredBlocks[i];
    BlockUpdate.triggerEvents({ block: source });
    for (const offset of Offsets) {
      let neighbor;
      try {
        neighbor = source.offset(offset);
      } catch {
        // Ignore invalid offset calls.
      }
      // Ensure we only trigger events once per block.
      if (neighbor !== undefined && !triggeredBlocks.includes(neighbor)) {
        triggeredBlocks.push(neighbor);
        BlockUpdate.triggerEvents({ block: neighbor, source });
      }
    }
  }
});

/**
 * List of methods to override for triggering block updates when blocks are modified.
 * @type {Array<{ class: any, name: string, method?: Function }>}
 */
const OriginalMethods = [
  { class: Block, name: "setType" },
  { class: Block, name: "setPermutation" },
  { class: Block, name: "setWaterlogged" },
  { class: Dimension, name: "setBlockType" },
  { class: Dimension, name: "setBlockPermutation" }
];

// Override selected methods to trigger block update events.
for (const data of OriginalMethods) {
  data.method = data.class.prototype[data.name];
  data.class.prototype[data.name] = function (arg1, arg2) {
    if (this instanceof Dimension) {
      data.method.bind(this)(arg1, arg2);
      const block = this.getBlock(arg1);
      if (block !== undefined) {
        BlockUpdate.trigger(block);
      }
    } else {
      data.method.bind(this)(arg1);
      BlockUpdate.trigger(this);
    }
  };
}

// // Example usage: spawn a particle above the updated block.
// BlockUpdate.on((data) => {
// data.block.dimension.spawnParticle(
//     "minecraft:villager_happy",
//     data.block.above().center()
//   );
// });

