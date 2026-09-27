/**
 * Cosmos Adventure Safe Teleportation & Void Fall Recovery
 * Manages chunk preparation ticking areas, status damping, and void boundary safety across planetary dimensions.
 * Adapted from the Misty Forest safe teleportation engine.
 */
import { world, system } from "@minecraft/server";
import { ALL_COSMOS_DIMENSION_IDS } from "./dimensions.js";
import { SPAWN_COORDINATES } from "./platform.js";
import { syncPlayerFog } from "./fog_manager.js";

export const activeTravelTimeouts = new Map();

/**
 * Teleports a player safely by pre-allocating a temporary ticking area,
 * damping kinematics with slow_falling and resistance, and scheduling ticking area release.
 * @param {import("@minecraft/server").Player} player
 * @param {string | import("@minecraft/server").Dimension} targetDimId
 * @param {import("@minecraft/server").Vector3} targetLocation
 */
export async function teleportPlayerSafely(player, targetDimId, targetLocation) {
    if (!player) return;

    const dimension = typeof targetDimId === "string" ? world.getDimension(targetDimId) : targetDimId;
    if (!dimension) return;

    const cleanPlayerId = String(player.id).replace(/[^a-zA-Z0-9_]/g, "_");
    const areaId = `travel_${cleanPlayerId}`;

    if (activeTravelTimeouts.has(areaId)) {
        try {
            system.clearRun(activeTravelTimeouts.get(areaId));
        } catch (e) {}
        activeTravelTimeouts.delete(areaId);
    }

    try {
        if (world.tickingAreaManager?.hasTickingArea?.(areaId)) {
            world.tickingAreaManager.removeTickingArea(areaId);
        }
    } catch (e) {}

    const tx = Math.floor(targetLocation.x);
    const ty = Math.floor(targetLocation.y);
    const tz = Math.floor(targetLocation.z);

    try {
        if (world.tickingAreaManager?.createTickingArea) {
            await world.tickingAreaManager.createTickingArea(areaId, {
                dimension,
                from: { x: tx - 16, y: 0, z: tz - 16 },
                to: { x: tx + 16, y: 160, z: tz + 16 }
            });
        }
    } catch (areaErr) {}

    try {
        if (typeof player.addEffect === "function") {
            try {
                player.addEffect("slow_falling", 60, { showParticles: false, amplifier: 0 });
                player.addEffect("resistance", 60, { showParticles: false, amplifier: 4 });
            } catch (e) {}
        }

        try {
            player.teleport(targetLocation, { dimension });
        } catch (teleportErr) {
            try {
                player.teleport(targetLocation);
            } catch (e) {}
        }

        try {
            system.runTimeout(() => {
                syncPlayerFog(player);
            }, 5);
        } catch (e) {}

        if (typeof player.playSound === "function") {
            try {
                player.playSound("portal.travel", { pitch: 1.2, volume: 1.0 });
            } catch (e) {}
        }
    } finally {
        const timeoutId = system.runTimeout(() => {
            activeTravelTimeouts.delete(areaId);
            try {
                if (world.tickingAreaManager?.hasTickingArea?.(areaId)) {
                    world.tickingAreaManager.removeTickingArea(areaId);
                }
            } catch (e) {}
        }, 60);
        activeTravelTimeouts.set(areaId, timeoutId);
    }
}

/**
 * Checks if a player inside a planetary dimension has fallen below Y=0.
 * If so, recovers the player back to safe surface coordinates with protective buffs.
 * @param {import("@minecraft/server").Player} player
 * @returns {boolean} True if recovery was performed
 */
export function checkAndRecoverVoidFall(player) {
    if (!player || !player.dimension || !player.location) return false;

    try {
        const dimId = player.dimension.id;
        if (!ALL_COSMOS_DIMENSION_IDS.includes(dimId)) return false;

        // Space stations let players fall back to earth if below Y=10
        if (dimId === "cosmos:space_stations") return false;

        if (player.location.y < 0) {
            try {
                if (typeof player.addEffect === "function") {
                    player.addEffect("slow_falling", 60, { showParticles: false, amplifier: 0 });
                    player.addEffect("resistance", 60, { showParticles: false, amplifier: 4 });
                }

                let recoverLoc = SPAWN_COORDINATES[dimId] || { x: 0.5, y: 92, z: 0.5 };
                try {
                    if (typeof player.dimension.getTopmostBlock === "function") {
                        const top = player.dimension.getTopmostBlock({ x: Math.floor(player.location.x), z: Math.floor(player.location.z) });
                        if (top && top.location && top.location.y > 0) {
                            recoverLoc = { x: player.location.x, y: top.location.y + 1, z: player.location.z };
                        }
                    }
                } catch (e) {}

                player.teleport(recoverLoc, { dimension: player.dimension });

                if (typeof player.playSound === "function") {
                    player.playSound("portal.travel", { pitch: 1.5, volume: 1.0 });
                }

                if (typeof player.onScreenDisplay?.setActionBar === "function") {
                    player.onScreenDisplay.setActionBar("[Cosmos] Void Boundary Recovery");
                }

                return true;
            } catch (e) {
                return false;
            }
        }
    } catch (e) {
        return false;
    }

    return false;
}

let isVoidLoopRunning = false;

/**
 * Starts continuous void fall monitoring for all players in Cosmos planetary dimensions.
 * Runs every 10 ticks (0.5 seconds).
 */
export function startVoidRecoveryLoop() {
    if (isVoidLoopRunning) return;
    isVoidLoopRunning = true;

    return system.runInterval(() => {
        try {
            for (const player of world.getAllPlayers()) {
                try {
                    checkAndRecoverVoidFall(player);
                } catch (e) {}
            }
        } catch (e) {}
    }, 10);
}
