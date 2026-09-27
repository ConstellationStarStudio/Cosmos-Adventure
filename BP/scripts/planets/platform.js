/**
 * Cosmos Adventure Safe Spawn Platform & Chunk Lifecycle
 * Ensures chunks are loaded before block manipulation and cleans up ticking areas.
 * Adapted from the Misty Forest safe spawn lifecycle.
 */
import { world, system, BlockPermutation } from "@minecraft/server";
import { 
    generateChunk, 
    generateSpawnTerrain, 
    isChunkPhysicallyMissing, 
    markChunkGenerated, 
    PLANET_WORLDGEN_CONFIG 
} from "./worldgen.js";

export { generateSpawnTerrain };

export const SPAWN_COORDINATES = {
    "minecraft:overworld": { x: 0.5, y: 75, z: 0.5 },
    "cosmos:moon": { x: 0.5, y: 92, z: 0.5 },
    "cosmos:mars": { x: 0.5, y: 95, z: 0.5 },
    "cosmos:venus": { x: 0.5, y: 70, z: 0.5 },
    "cosmos:asteroids": { x: 0.5, y: 70, z: 0.5 },
    "cosmos:space_stations": { x: -3.5, y: 72, z: -3.5 }
};

const spawnPlatformBuilt = new Set();
const activeSpawnPromises = new Map();

function resolvePermutation(typeId) {
    try {
        return BlockPermutation.resolve(typeId);
    } catch {
        return null;
    }
}

/**
 * Builds a solid 5x5 platform at floorY and clears headroom Y=floorY+1..floorY+4.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {number} cx Center X
 * @param {number} floorY Floor level
 * @param {number} cz Center Z
 * @param {string} [blockType="minecraft:smooth_stone"]
 */
export function buildLandingPlatform(dimension, cx = 0, floorY = 65, cz = 0, blockType = "minecraft:smooth_stone") {
    if (!dimension) return;

    const floorPerm = resolvePermutation(blockType) || resolvePermutation("minecraft:stone");
    const airPerm = resolvePermutation("minecraft:air");

    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const bx = cx + dx;
            const bz = cz + dz;

            if (floorPerm) {
                try {
                    const floorBlock = dimension.getBlock({ x: bx, y: floorY, z: bz });
                    if (floorBlock && floorBlock.typeId === "minecraft:air") {
                        floorBlock.setPermutation(floorPerm);
                    }
                } catch (e) {}
            }

            if (airPerm) {
                for (let y = floorY + 1; y <= floorY + 4; y++) {
                    try {
                        const airBlock = dimension.getBlock({ x: bx, y: y, z: bz });
                        if (airBlock && airBlock.typeId !== "minecraft:air") {
                            airBlock.setPermutation(airPerm);
                        }
                    } catch (e) {}
                }
            }
        }
    }
}

/**
 * Allocates temporary ticking area, awaits chunk readiness, pre-generates 5x5 chunk terrain,
 * finds true surface elevation, builds safe spawn platform,
 * and guarantees ticking area removal with safety delay.
 * @param {import("@minecraft/server").Dimension | string} dimension
 * @returns {Promise<{ x: number, y: number, z: number }>}
 */
export async function ensureDimensionSpawn(dimension) {
    const dim = typeof dimension === "string" ? world.getDimension(dimension) : dimension;
    if (!dim) return { x: 0.5, y: 90, z: 0.5 };

    const dimId = dim.id;
    if (spawnPlatformBuilt.has(dimId)) {
        return SPAWN_COORDINATES[dimId] || { x: 0.5, y: 90, z: 0.5 };
    }
    if (activeSpawnPromises.has(dimId)) {
        return activeSpawnPromises.get(dimId);
    }

    if (dimId === "minecraft:overworld") {
        let surfaceY = 75;
        try {
            if (typeof dim.getTopmostBlock === "function") {
                const top = dim.getTopmostBlock({ x: 0, z: 0 });
                if (top && top.location && top.location.y > 0) {
                    surfaceY = top.location.y + 1;
                }
            }
        } catch (e) {}
        const coords = { x: 0.5, y: surfaceY, z: 0.5 };
        SPAWN_COORDINATES[dimId] = coords;
        spawnPlatformBuilt.add(dimId);
        return coords;
    }

    if (dimId === "cosmos:space_stations") {
        try {
            dim.placeFeature("cosmos:station_feature", { x: 0, y: 65, z: 0 });
        } catch (e) {}
        buildLandingPlatform(dim, -3, 71, -3, "minecraft:iron_block");
        const coords = { x: -3.5, y: 72, z: -3.5 };
        SPAWN_COORDINATES[dimId] = coords;
        spawnPlatformBuilt.add(dimId);
        return coords;
    }

    if (dimId === "cosmos:venus" || dimId === "cosmos:asteroids") {
        const floorBlock = dimId === "cosmos:venus" ? "minecraft:stone" : "minecraft:deepslate";
        buildLandingPlatform(dim, 0, 69, 0, floorBlock);
        const coords = { x: 0.5, y: 70, z: 0.5 };
        SPAWN_COORDINATES[dimId] = coords;
        spawnPlatformBuilt.add(dimId);
        return coords;
    }

    const promise = (async () => {
        const cleanId = dimId.replace(/[^a-zA-Z0-9_]/g, "_");
        const areaId = `setup_${cleanId}_spawn`;

        // 1. Clean prior area if exists
        try {
            if (world.tickingAreaManager?.hasTickingArea?.(areaId)) {
                world.tickingAreaManager.removeTickingArea(areaId);
            }
        } catch (e) {}

        // 2. Prepare 5x5 chunk ticking perimeter (-48..48, Y=0..160)
        try {
            if (world.tickingAreaManager?.createTickingArea) {
                await world.tickingAreaManager.createTickingArea(areaId, {
                    dimension: dim,
                    from: { x: -48, y: 0, z: -48 },
                    to: { x: 48, y: 160, z: 48 }
                });
            } else if (typeof dim.runCommand === "function") {
                try {
                    dim.runCommand(`tickingarea add circle 0 90 0 2 ${areaId}`);
                } catch (e) {}
            }
        } catch (quotaErr) {}

        try {
            // 3. Pre-generate surrounding 5x5 chunks (-2..2, -2..2)
            generateSpawnTerrain(dim, 0, 0, 2);

            const config = PLANET_WORLDGEN_CONFIG[dimId];
            if (config && isChunkPhysicallyMissing(dim, 0, 0)) {
                try {
                    const placed = dim.placeFeature(config.featureId, { x: 0, y: 0, z: 0 });
                    if (placed) markChunkGenerated(dimId, 0, 0);
                } catch (e) {}
            }

            // 4. Determine true surface elevation at (0, 0)
            let surfaceY = config?.surfaceFallbackY || 90;
            try {
                if (typeof dim.getTopmostBlock === "function") {
                    const top = dim.getTopmostBlock({ x: 0, z: 0 });
                    if (top && top.location && top.location.y > 0) {
                        surfaceY = top.location.y + 1;
                    }
                }
            } catch (e) {}

            // Downward scan fallback if needed
            if (surfaceY < 20 || surfaceY > 200) {
                for (let y = 160; y >= 1; y--) {
                    try {
                        const b = dim.getBlock({ x: 0, y, z: 0 });
                        if (b && b.typeId !== "minecraft:air") {
                            surfaceY = y + 1;
                            break;
                        }
                    } catch (e) {}
                }
            }

            const spawnCoords = { x: 0.5, y: surfaceY, z: 0.5 };
            SPAWN_COORDINATES[dimId] = spawnCoords;

            // 5. Build safe landing platform at true surface
            const floorType = dimId === "cosmos:mars" ? "cosmos:mars_stone" : "cosmos:moon_rock";
            buildLandingPlatform(dim, 0, surfaceY - 1, 0, floorType);
            spawnPlatformBuilt.add(dimId);

            return spawnCoords;
        } finally {
            // 6. Schedule ticking area removal with 60-tick safety buffer
            system.runTimeout(() => {
                try {
                    if (world.tickingAreaManager?.hasTickingArea?.(areaId)) {
                        world.tickingAreaManager.removeTickingArea(areaId);
                    }
                } catch (e) {}
                try {
                    dim.runCommand?.(`tickingarea remove ${areaId}`);
                } catch (e) {}
            }, 60);

            activeSpawnPromises.delete(dimId);
        }
    })();

    activeSpawnPromises.set(dimId, promise);
    return promise;
}
