
import * as mc from "@minecraft/server";
import { destroyBlocksJOB, getHand, select_random_item } from "api/utils";

const { world, system, TicksPerSecond, BlockPermutation } = mc;
const typeId = "cosmos:cavernous_vines";

export class CavernousVine {
    static keyFor(block) {
        return `${block.dimension.id},${block.x},${block.y},${block.z}`;
    }

    /** @type {Map<string,CavernousVine>} */
    static vineMap = new Map();

    /**
     * @param {mc.Block} baseBlock
     * @returns {CavernousVine}
     **/
    static get(baseBlock) {
        if (baseBlock.typeId !== typeId) return;
        const key_dimXZ = this.keyFor(baseBlock);
        let cavernVines = this.vineMap.get(key_dimXZ);
        return cavernVines ?? this.vineMap.set(key_dimXZ, new CavernousVine(baseBlock, key_dimXZ)).get(key_dimXZ);
    }

    static cut(block) {
        this.isAvailable = false;
        let currBlock = block;
        let vineBlocks = [];
        let lower_Y = block.dimension.heightRange.min;
        while (currBlock.typeId === typeId) {
            vineBlocks.push(currBlock);
            if (lower_Y === currBlock.y) break;
            currBlock = currBlock.below();
        };
        this.isAvailable ||= true;
        system.runJob(destroyBlocksJOB(vineBlocks, block.dimension));
    }

    /**
     * @private
     * @param {mc.Block} baseBlock 
     * @param {string} xyz_key `${block.x},${block.y},${block.z}`
     **/
    constructor(baseBlock, xyz_key) {
        this.dimension = baseBlock.dimension;
        this.base = baseBlock;
        this.#location = { ...baseBlock };
        let currBlock = baseBlock;
        let length = 0;
        let lower_Y = this.dimension.heightRange.min;
        while (currBlock.typeId === typeId) {
            length++;
            if (lower_Y === currBlock.y) break;
            currBlock = currBlock.below();
        }
        this.stemLength = length;
        if (!CavernousVine.vineMap.has(xyz_key)) CavernousVine.vineMap.set(xyz_key, this);
        this.isAvailable ||= true;
    }
    #location
    stemLength = 1;
    #isGrabbingEntities = false;

    get location() { return { ...this.#location } }
    *getEntities() {
        const query = {
            location: this.location,
            volume: { x: 0, y: this.stemLength - 1, z: 0 }
        };
        query.location.y -= this.stemLength - 1;
        for (const entity of this.dimension.getEntities(query)) {
            if (entity.hasComponent("movement")) yield entity;
        }

    }

    /**
     * Grabs entities upward and overrides their gravity.
     */
    grabEntities() {
        if (this.#isGrabbingEntities) return;
        this.#isGrabbingEntities = true;
        try {
            const vector = { x: 0, y: 0.1, z: 0 };
            const tick20 = system.currentTick % 20 == 0;
            for (const entity of this.getEntities()) {

                // Temporarily override gravity
                const originalGravity = entity.getDynamicProperty("originalGravity");
                if (originalGravity === undefined) {
                    // Store the original gravity value
                    entity.setDynamicProperty("originalGravity", entity.getDynamicProperty("sert:gravity") ?? 9.8);
                }
                entity.setDynamicProperty("sert:gravity", 0); // Set gravity to 0
                // Apply upward impulse
                if (entity.typeId === "minecraft:player") {
                    entity.applyKnockback(0, 0, 0, vector.y);
                } else {
                    entity.clearVelocity(); // Clear velocity to avoid incrementing velocity
                    entity.applyImpulse(vector); // Apply impulse to the entity
                }

                // Apply poison effect every second
                if (entity.hasComponent("health") && tick20) this.applyPoison(entity);
            }
        } catch (error) { console.error(error, error?.stack) }
        this.#isGrabbingEntities = false;
    }

    /**
     * Restores the original gravity for entities no longer grabbed by the vine.
     */
    restoreGravity() {
        for (const entity of this.getEntities()) {
            const originalGravity = entity.getDynamicProperty("originalGravity");
            if (originalGravity !== undefined) {
                // Restore the original gravity value
                entity.setDynamicProperty("sert:gravity", originalGravity);
                entity.setDynamicProperty("originalGravity", undefined); // Clear the stored value
            }
        }
    }

    /**
     * Applies poison effect to the entity.
     * @param {mc.Entity} entity
     */
    applyPoison(entity) {
        entity.addEffect("minecraft:poison", TicksPerSecond * 2); // Apply poison effect for 2 seconds
    }

    update() {
        let lowerBlock = this.base;
        let length = 0;
        let lower_Y = this.dimension.heightRange.min;
        while (lowerBlock?.typeId === typeId) {
            length++;
            if (lower_Y === lowerBlock.y) {
                this.stemLength = length;
                return;
            }
            lowerBlock = lowerBlock.below();
        }
        this.stemLength = length;
    }

    vineGrowth() {
        this.isAvailable = false;
        let lowerBlock = this.base;
        let currBlock = lowerBlock.above();
        let length = 0;
        let lower_Y = this.dimension.heightRange.min;
        while (lowerBlock?.typeId === typeId) {
            length++;
            if (lower_Y === lowerBlock.y) {
                this.stemLength = length;
                this.isAvailable ||= true;
                return;
            }
            currBlock = lowerBlock;
            lowerBlock = lowerBlock.below();
            if (currBlock.permutation.getState("cosmos:age") === 0) {
                if (lowerBlock.typeId === typeId) CavernousVine.cut(lowerBlock);
                break;
            }
        }
        const vineTipPerm = currBlock.permutation;
        let vineAge = Number(vineTipPerm.getState("cosmos:age"));
        if (vineAge < 15) {
            vineAge += select_random_item([1, 2]);
            if (vineAge > 15) vineAge = 15;
            currBlock.setPermutation(vineTipPerm.withState("cosmos:age", vineAge));
        } else if (lowerBlock?.typeId === "minecraft:air") {
            lowerBlock.setPermutation(
                BlockPermutation.resolve(typeId, {
                    ["cosmos:variant"]: currBlock.permutation.getState("cosmos:variant")
                })
            );
        }
        this.stemLength = length;
        this.isAvailable ||= true;

    }
}

system.beforeEvents.startup.subscribe(ev => {

    const CV = CavernousVine;

    ev.blockComponentRegistry.registerCustomComponent(typeId, {

        onPlace: ({ block }) => {
            const aboveBlock = block.above();
            if (aboveBlock.typeId !== typeId) {
                if (aboveBlock.typeId === "minecraft:air") block.setType("air");
                return;
            }
            const perm = block.permutation;
            const aboveVairant = aboveBlock.permutation.getState("cosmos:variant");
            if (perm.getState("cosmos:variant") === aboveVairant) return;
            block.setPermutation(perm.withState("cosmos:variant", aboveVairant));
        },

        beforeOnPlayerPlace: async data => {
            mc.system.run(() => {
                const vineVariants = mc.BlockStates.get("cosmos:variant")?.validValues.map(v =>
                    BlockPermutation.resolve(typeId).withState("cosmos:variant", v)
                ) ?? [];
                if (data.cancel || !data.player || data.face !== "Down") return;
                const abovePerm = data.block.above().permutation;
                if (abovePerm.type.id === typeId) {
                    const permToPlace = data.permutationToPlace;
                    if (abovePerm === permToPlace) return;
                    const aboveVairant = abovePerm.getState("cosmos:variant");
                    if (abovePerm.getState("cosmos:attached_bit") === true) {
                        data.permutationToPlace = abovePerm.withState("cosmos:attached_bit", false);
                    } else if (permToPlace.getState("cosmos:variant") !== aboveVairant) {
                        data.permutationToPlace = abovePerm.withState("cosmos:variant", aboveVairant);
                    }
                } else data.permutationToPlace = select_random_item(vineVariants).withState("cosmos:attached_bit", true);
            });
        },

        onPlayerInteract: ({ block, player }) => {
            const hand = player && getHand(player);
            if (!hand?.hasItem()) return;
            if (hand.typeId === "minecraft:shears") {
                const perm = block.permutation;
                if (perm.getState("cosmos:age") === 0) return;
                block.setPermutation(perm.withState("cosmos:age", 0));
            }
        },

        onTick: ({ block }) => {
            const aboveBlock = block.above();
            if (aboveBlock.typeId == "minecraft:air") {
                let currBlock = block;
                if (currBlock.typeId === typeId) {
                    CV.cut(block);
                }
            } else if (aboveBlock.typeId === typeId) return;
            if (block.permutation.getState("cosmos:attached_bit") === true) {
                const cavernVines = CV.get(block);
                if (!cavernVines?.isAvailable) return;
                cavernVines.update();
                cavernVines.grabEntities();
            }
        },

        onRandomTick: ({ block }) => {
            if (block.permutation.getState("cosmos:attached_bit") === true) {
                const cavernVines = CV.get(block);
                if (!cavernVines?.isAvailable) return;
                cavernVines.vineGrowth();
            };
        }
    });
})

export default CavernousVine;