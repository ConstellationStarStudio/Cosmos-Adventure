/**
 * Cosmos Adventure Infinite Procedural Chunk Generator
 * Places native Molang chunk-scatter features around players across custom planetary dimensions.
 * Migrated from the Misty Forest dynamic world generation engine.
 * 
 * Features:
 * - L1 In-Memory Cache + L2 Scoreboard Database for persistent chunk tracking
 * - Ring-based proximity prioritization (Ring 0 -> Ring 1 -> Ring 2)
 * - Immediate vision cone & movement velocity vector prioritization
 * - Far-chunk queue eviction when transitioning chunk boundaries
 * - Strict per-tick placement budget and 2.0ms execution time ceiling
 * - Dimension-aware routing for Moon, Mars, and future bodies
 */
import { world, system } from "@minecraft/server";
import { COSMOS_DIMENSIONS } from "./dimensions.js";

export const PLANET_WORLDGEN_CONFIG = {
    [COSMOS_DIMENSIONS.MOON]: {
        featureId: "cosmos:moon/chunk",
        scoreboardObjective: "cos_moon_chk",
        surfaceFallbackY: 90
    },
    [COSMOS_DIMENSIONS.MARS]: {
        featureId: "cosmos:mars/chunk",
        scoreboardObjective: "cos_mars_chk",
        surfaceFallbackY: 93
    }
};

export const MAX_PLACEMENTS_PER_TICK = 2;
export const MAX_TICK_BUDGET_MS = 2.0;

// L1 in-memory cache: Set of `${dimId}:${cx},${cz}`
export const generatedChunks = new Set();

/**
 * Bitpacks two 32-bit chunk coordinates into a 64-bit compact hex key.
 * @param {number} cx
 * @param {number} cz
 * @returns {string}
 */
export function packChunkCoords(cx, cz) {
    const ux = BigInt.asUintN(32, BigInt(Math.floor(cx)));
    const uz = BigInt.asUintN(32, BigInt(Math.floor(cz)));
    return (ux | (uz << 32n)).toString(16);
}

/**
 * Retrieves or registers scoreboard objective for persistent chunk tracking across world reloads.
 * @param {string} dimId
 * @returns {import("@minecraft/server").ScoreboardObjective|null}
 */
export function getScoreboardObjective(dimId) {
    try {
        if (!world || !world.scoreboard) return null;
        const config = PLANET_WORLDGEN_CONFIG[dimId];
        if (!config || !config.scoreboardObjective) return null;

        const objName = config.scoreboardObjective;
        let obj = world.scoreboard.getObjective(objName);
        if (!obj) {
            obj = world.scoreboard.addObjective(objName, objName);
        }
        return obj;
    } catch {
        return null;
    }
}

/**
 * Checks whether a chunk is generated (L1 memory cache or persistent scoreboard).
 * @param {string} dimId
 * @param {number} cx
 * @param {number} cz
 * @returns {boolean}
 */
export function isChunkGenerated(dimId, cx, cz) {
    const memKey = `${dimId}:${cx},${cz}`;
    if (generatedChunks.has(memKey)) return true;

    const obj = getScoreboardObjective(dimId);
    if (!obj) return false;

    const hexKey = packChunkCoords(cx, cz);
    try {
        if (typeof obj.hasParticipant === "function" && obj.hasParticipant(hexKey)) {
            generatedChunks.add(memKey);
            return true;
        }
        if (typeof obj.getScore === "function") {
            const score = obj.getScore(hexKey);
            if (score !== undefined) {
                generatedChunks.add(memKey);
                return true;
            }
        }
    } catch {
        return false;
    }
    return false;
}

/**
 * Marks chunk as generated in both L1 cache and persistent scoreboard database.
 * @param {string} dimId
 * @param {number} cx
 * @param {number} cz
 */
export function markChunkGenerated(dimId, cx, cz) {
    const memKey = `${dimId}:${cx},${cz}`;
    generatedChunks.add(memKey);

    const obj = getScoreboardObjective(dimId);
    if (!obj) return;

    const hexKey = packChunkCoords(cx, cz);
    try {
        obj.setScore(hexKey, 1);
    } catch {}
}

/**
 * Checks whether a chunk is physically missing terrain/bedrock at y=0.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {number} cx
 * @param {number} cz
 * @returns {boolean} True if bedrock is missing at y=0
 */
export function isChunkPhysicallyMissing(dimension, cx, cz) {
    if (!dimension || typeof dimension.getBlock !== "function") return false;
    try {
        const b = dimension.getBlock({ x: cx * 16 + 8, y: 0, z: cz * 16 + 8 });
        return b !== undefined && b !== null && b.typeId === "minecraft:air";
    } catch {
        return false;
    }
}

/**
 * Generates a single chunk at (cx, cz) using native feature dispatch.
 * Automatically self-heals chunks physically missing terrain.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {number} cx
 * @param {number} cz
 * @returns {boolean} True if feature was successfully placed
 */
export function generateChunk(dimension, cx, cz) {
    if (!dimension) return false;
    const dimId = dimension.id;
    const config = PLANET_WORLDGEN_CONFIG[dimId];
    if (!config) return false;

    if (isChunkGenerated(dimId, cx, cz)) {
        if (!isChunkPhysicallyMissing(dimension, cx, cz)) {
            return false;
        }
        generatedChunks.delete(`${dimId}:${cx},${cz}`);
    }

    try {
        const origin = { x: cx * 16, y: 0, z: cz * 16 };
        if (typeof dimension.placeFeature === "function") {
            const placed = dimension.placeFeature(config.featureId, origin);
            if (placed) {
                markChunkGenerated(dimId, cx, cz);
                return true;
            }
        }
    } catch {}
    return false;
}

/**
 * Pre-generates the spawn perimeter terrain chunks.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {number} chunkCenterX
 * @param {number} chunkCenterZ
 * @param {number} chunkRadius
 */
export function generateSpawnTerrain(dimension, chunkCenterX = 0, chunkCenterZ = 0, chunkRadius = 2) {
    if (!dimension || typeof dimension.placeFeature !== "function") return;
    const dimId = dimension.id;
    const config = PLANET_WORLDGEN_CONFIG[dimId];
    if (!config) return;

    for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
            const cx = chunkCenterX + dx;
            const cz = chunkCenterZ + dz;
            if (isChunkGenerated(dimId, cx, cz)) {
                if (!isChunkPhysicallyMissing(dimension, cx, cz)) continue;
                generatedChunks.delete(`${dimId}:${cx},${cz}`);
            }

            const origin = { x: cx * 16, y: 0, z: cz * 16 };
            try {
                const placed = dimension.placeFeature(config.featureId, origin);
                if (placed) {
                    markChunkGenerated(dimId, cx, cz);
                }
            } catch (err) {
                // Chunk pending streaming
            }
        }
    }
}

/**
 * Active chunk generation queue tracking prioritized ungenerated chunks for placement.
 */
export const chunkGenerationQueue = [];

/**
 * Tracks previous chunk coordinates per player to detect chunk transitions and evict left-behind chunks.
 */
export const playerChunkPositions = new Map();

/**
 * Evaluates player proximity, heading, and vision cone to prioritize immediate visible chunks,
 * drops chunks left behind from the queue, and executes placements within tick budget.
 *
 * @param {import("@minecraft/server").Player} player
 * @param {number} [radius=3] Search radius in chunks (default 3 = 7x7 chunks around player)
 * @param {number} [tickStart=Date.now()]
 * @param {number} [maxPlacements=MAX_PLACEMENTS_PER_TICK]
 * @param {number} [maxBudgetMs=MAX_TICK_BUDGET_MS] Hard execution time cap in milliseconds
 * @returns {number} Number of chunks successfully generated this call
 */
export function updatePlayerChunks(player, radius = 3, tickStart = Date.now(), maxPlacements = MAX_PLACEMENTS_PER_TICK, maxBudgetMs = MAX_TICK_BUDGET_MS) {
    if (!player || !player.dimension || !player.location) return 0;
    const dimId = player.dimension.id;
    if (!PLANET_WORLDGEN_CONFIG[dimId]) return 0;

    const dim = player.dimension;
    const px = Math.floor(player.location.x);
    const pz = Math.floor(player.location.z);
    const centerChunkX = Math.floor(px / 16);
    const centerChunkZ = Math.floor(pz / 16);
    const playerId = player.id || player.name;

    // Detect player movement velocity and camera look direction
    let dirX = 0;
    let dirZ = 0;
    let hasDirection = false;

    // 1. Camera view direction (immediate vision cone)
    let viewX = 0;
    let viewZ = 0;
    let hasView = false;
    try {
        if (typeof player.getViewDirection === "function") {
            const v = player.getViewDirection();
            if (v) {
                const hLen = Math.hypot(v.x, v.z);
                if (hLen > 0.05) {
                    viewX = v.x / hLen;
                    viewZ = v.z / hLen;
                    hasView = true;
                }
            }
        }
    } catch {}

    // 2. Velocity vector (travel direction)
    let moveX = 0;
    let moveZ = 0;
    let isMoving = false;
    try {
        if (typeof player.getVelocity === "function") {
            const vel = player.getVelocity();
            if (vel) {
                const speedSq = vel.x * vel.x + vel.z * vel.z;
                if (speedSq > 0.005) {
                    const speed = Math.sqrt(speedSq);
                    moveX = vel.x / speed;
                    moveZ = vel.z / speed;
                    isMoving = true;
                }
            }
        }
    } catch {}

    // Combine view and movement heading
    if (isMoving && hasView) {
        dirX = moveX * 0.65 + viewX * 0.35;
        dirZ = moveZ * 0.65 + viewZ * 0.35;
        const len = Math.hypot(dirX, dirZ);
        if (len > 0.05) {
            dirX /= len;
            dirZ /= len;
            hasDirection = true;
        }
    } else if (hasView) {
        dirX = viewX;
        dirZ = viewZ;
        hasDirection = true;
    } else if (isMoving) {
        dirX = moveX;
        dirZ = moveZ;
        hasDirection = true;
    }

    // 3. Proximity Analysis: determine minimum ungenerated ring distance around player
    let minUngeneratedRing = radius + 1;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            const cx = centerChunkX + dx;
            const cz = centerChunkZ + dz;
            if (!isChunkGenerated(dimId, cx, cz) || isChunkPhysicallyMissing(dim, cx, cz)) {
                const r = Math.max(Math.abs(dx), Math.abs(dz));
                if (r < minUngeneratedRing) {
                    minUngeneratedRing = r;
                }
            }
        }
    }

    // If everything in radius is already generated, purge queue and return
    if (minUngeneratedRing > radius) {
        chunkGenerationQueue.length = 0;
        playerChunkPositions.set(playerId, { cx: centerChunkX, cz: centerChunkZ });
        return 0;
    }

    // 4. Active Horizon Gating:
    // If immediate proximity (ring <= 1) is ungenerated, prioritize ring 1 exclusively.
    // If ring 1 is complete, expand to ring 2, then radius.
    // Far-away queued chunks (ring > maxActiveRing) are discarded/evicted for later.
    const maxActiveRing = minUngeneratedRing <= 1 ? 1 : (minUngeneratedRing === 2 ? 2 : radius);

    // 5. Detect player chunk movement & Drop chunks left behind
    const prevPos = playerChunkPositions.get(playerId);
    if (prevPos && (prevPos.cx !== centerChunkX || prevPos.cz !== centerChunkZ)) {
        for (let i = chunkGenerationQueue.length - 1; i >= 0; i--) {
            const item = chunkGenerationQueue[i];
            const distFromNewCenter = Math.max(Math.abs(item.cx - centerChunkX), Math.abs(item.cz - centerChunkZ));
            if (distFromNewCenter > maxActiveRing || isChunkGenerated(dimId, item.cx, item.cz)) {
                chunkGenerationQueue.splice(i, 1);
            }
        }
    }
    playerChunkPositions.set(playerId, { cx: centerChunkX, cz: centerChunkZ });

    // 6. Collect candidate ungenerated chunks strictly within the active proximity horizon
    const candidates = [];
    for (let dx = -maxActiveRing; dx <= maxActiveRing; dx++) {
        for (let dz = -maxActiveRing; dz <= maxActiveRing; dz++) {
            const ring = Math.max(Math.abs(dx), Math.abs(dz));
            if (ring > maxActiveRing) continue;

            const cx = centerChunkX + dx;
            const cz = centerChunkZ + dz;
            const needsGen = !isChunkGenerated(dimId, cx, cz) || isChunkPhysicallyMissing(dim, cx, cz);
            if (!needsGen) continue;

            const rawDistSq = dx * dx + dz * dz;
            // Strict proximity tier weighting: each ring tier separated by 1000 units
            let distSq = ring * 1000 + rawDistSq;

            // Vision and movement direction bias within the same ring
            if (hasDirection) {
                if (dx === 0 && dz === 0) {
                    distSq -= 100;
                } else {
                    const chunkDist = Math.hypot(dx, dz);
                    const dot = (dx * dirX + dz * dirZ) / chunkDist;
                    distSq -= Math.round(dot * 60);
                }
            }

            candidates.push({ cx, cz, ring, distSq, dx, dz, dimId });
        }
    }

    if (candidates.length === 0) {
        chunkGenerationQueue.length = 0;
        return 0;
    }

    // 7. Sort candidates: Closest ring first, then immediate vision cone
    candidates.sort((a, b) => a.distSq - b.distSq);

    // 8. Synchronize active chunk generation queue
    chunkGenerationQueue.length = 0;
    for (let i = 0; i < candidates.length; i++) {
        chunkGenerationQueue[i] = candidates[i];
    }

    // High-resolution clock compatibility
    const getNow = (typeof performance !== "undefined" && typeof performance.now === "function")
        ? () => performance.now()
        : () => Date.now();

    // 9. Execute placements up to budget (strictly capped by maxBudgetMs)
    let placedCount = 0;
    for (const candidate of candidates) {
        if (placedCount >= maxPlacements) break;
        if (getNow() - tickStart >= maxBudgetMs && placedCount > 0) break;

        const success = generateChunk(dim, candidate.cx, candidate.cz);
        if (success) {
            placedCount++;
        }
    }

    // Clean up placed chunks from generation queue
    for (let i = chunkGenerationQueue.length - 1; i >= 0; i--) {
        const item = chunkGenerationQueue[i];
        if (isChunkGenerated(dimId, item.cx, item.cz)) {
            chunkGenerationQueue.splice(i, 1);
        }
    }

    return placedCount;
}

let isCoordinatorRunning = false;

/**
 * Worldgen coordinator loop: gathers ungenerated chunks around players across active planetary dimensions,
 * evaluates proximity and vision queues, drops left-behind chunks,
 * and executes feature placements within tick budget (strictly capped at MAX_TICK_BUDGET_MS = 2ms).
 */
export function startWorldgenCoordinator() {
    if (isCoordinatorRunning) return;
    isCoordinatorRunning = true;

    const getNow = (typeof performance !== "undefined" && typeof performance.now === "function")
        ? () => performance.now()
        : () => Date.now();

    return system.runInterval(() => {
        const startTime = getNow();
        let totalPlaced = 0;

        for (const player of world.getAllPlayers()) {
            if (!player || !player.dimension || !player.location) continue;
            const dimId = player.dimension.id;
            if (!PLANET_WORLDGEN_CONFIG[dimId]) continue;

            const remainingBudget = MAX_PLACEMENTS_PER_TICK - totalPlaced;
            if (remainingBudget <= 0) break;

            const placed = updatePlayerChunks(player, 3, startTime, remainingBudget, MAX_TICK_BUDGET_MS);
            totalPlaced += placed;

            if (totalPlaced >= MAX_PLACEMENTS_PER_TICK) break;
            if (getNow() - startTime >= MAX_TICK_BUDGET_MS) break;
        }
    }, 2);
}
