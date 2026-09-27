/**
 * Cosmos Adventure Dimension-Aware Fog Manager
 * Dynamically pushes and removes planetary atmospheric fogs based on player dimension.
 * Overworld, Moon, Nether, and The End remain clear; Mars maintains its Martian atmosphere.
 * Adapted from the Misty Forest fog management engine.
 */
import { world, system } from "@minecraft/server";
import { COSMOS_DIMENSIONS } from "./dimensions.js";

export const MARS_FOG_ID = "cosmos:mars_fog";
export const MARS_FOG_TAG = "mars";

export const activeMarsFogPlayers = new Set();

/**
 * Applies Mars atmospheric fog to a player.
 * @param {import("@minecraft/server").Player} player
 */
export function applyMarsFog(player) {
    if (!player) return;

    try {
        if (player.fogSettings?.push) {
            player.fogSettings.push(MARS_FOG_ID, MARS_FOG_TAG);
            activeMarsFogPlayers.add(player.id);
            return;
        }
    } catch (e) {}

    try {
        if (typeof player.runCommand === "function") {
            player.runCommand(`fog @s push ${MARS_FOG_ID} ${MARS_FOG_TAG}`);
            activeMarsFogPlayers.add(player.id);
        }
    } catch (e) {}
}

/**
 * Removes Mars atmospheric fog from a player.
 * @param {import("@minecraft/server").Player} player
 */
export function removeMarsFog(player) {
    if (!player) return;

    try {
        if (player.fogSettings?.remove) {
            player.fogSettings.remove(MARS_FOG_TAG);
            activeMarsFogPlayers.delete(player.id);
            return;
        }
    } catch (e) {}

    try {
        if (typeof player.runCommand === "function") {
            player.runCommand(`fog @s remove ${MARS_FOG_TAG}`);
            activeMarsFogPlayers.delete(player.id);
        }
    } catch (e) {}
}

/**
 * Synchronizes a player's fog based strictly on their current dimension.
 * @param {import("@minecraft/server").Player} player
 */
export function syncPlayerFog(player) {
    if (!player || !player.dimension) return;

    const isInsideMars = player.dimension.id === COSMOS_DIMENSIONS.MARS;
    const hasFog = activeMarsFogPlayers.has(player.id);

    if (isInsideMars) {
        if (!hasFog) {
            applyMarsFog(player);
        }
    } else {
        removeMarsFog(player);
    }
}

let isFogManagerStarted = false;

/**
 * Starts the dimension-aware script fog management lifecycle.
 */
export function startFogManager() {
    if (isFogManagerStarted) return;
    isFogManagerStarted = true;

    try {
        world.afterEvents.playerDimensionChange?.subscribe?.((event) => {
            syncPlayerFog(event.player);
        });
    } catch (e) {}

    try {
        world.afterEvents.playerSpawn?.subscribe?.((event) => {
            syncPlayerFog(event.player);
        });
    } catch (e) {}

    try {
        world.afterEvents.playerLeave?.subscribe?.((event) => {
            activeMarsFogPlayers.delete(event.playerId);
        });
    } catch (e) {}

    // Periodic sweep every 20 ticks (1 second) to ensure zero fog desync
    system.runInterval(() => {
        try {
            for (const player of world.getAllPlayers()) {
                syncPlayerFog(player);
            }
        } catch (e) {}
    }, 20);
}
