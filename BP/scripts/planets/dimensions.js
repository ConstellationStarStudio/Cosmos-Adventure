/**
 * Cosmos Adventure Custom Dimension Registry
 * Registers all true planetary custom dimensions during engine startup.
 */
import { system } from "@minecraft/server";

export const COSMOS_DIMENSIONS = {
    MOON: "cosmos:moon",
    MARS: "cosmos:mars",
    VENUS: "cosmos:venus",
    ASTEROIDS: "cosmos:asteroids",
    SPACE_STATIONS: "cosmos:space_stations"
};

export const ALL_COSMOS_DIMENSION_IDS = Object.values(COSMOS_DIMENSIONS);

let isDimensionsRegistered = false;

/**
 * Registers all Cosmos custom dimensions in system.beforeEvents.startup.
 * Safe against duplicate registration.
 */
export function registerDimensions() {
    if (isDimensionsRegistered) return;
    isDimensionsRegistered = true;

    system.beforeEvents.startup.subscribe((event) => {
        if (!event || !event.dimensionRegistry) return;
        for (const dimId of ALL_COSMOS_DIMENSION_IDS) {
            try {
                event.dimensionRegistry.registerCustomDimension(dimId);
            } catch (e) {}
        }
    });
}

// Parity alias
export const registerCustomDimensions = registerDimensions;
