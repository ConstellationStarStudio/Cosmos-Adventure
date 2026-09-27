/**
 * Cosmos Adventure Korolev Interplanetary Warp & Dimension Navigator
 * Provides the /korolev and /cosmos:korolev custom slash commands and
 * interactive ActionFormData planetary travel UI.
 * Named in honor of Sergey Korolev, pioneer of the space age.
 */
import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { COSMOS_DIMENSIONS, ALL_COSMOS_DIMENSION_IDS } from "./dimensions.js";
import { ensureDimensionSpawn, SPAWN_COORDINATES } from "./platform.js";
import { teleportPlayerSafely } from "./teleport.js";

export const KOROLEV_DESTINATIONS = {
    "overworld": {
        id: "minecraft:overworld",
        name: "Overworld",
        subtitle: "Terra / Earth Base",
        badge: "Overworld"
    },
    "earth": {
        id: "minecraft:overworld",
        name: "Overworld",
        subtitle: "Terra / Earth Base",
        badge: "Overworld"
    },
    "moon": {
        id: COSMOS_DIMENSIONS.MOON,
        name: "Moon",
        subtitle: "Lunar Surface & Low Gravity",
        badge: "Moon"
    },
    "luna": {
        id: COSMOS_DIMENSIONS.MOON,
        name: "Moon",
        subtitle: "Lunar Surface & Low Gravity",
        badge: "Moon"
    },
    "mars": {
        id: COSMOS_DIMENSIONS.MARS,
        name: "Mars",
        subtitle: "Aresian Red Planet & Caverns",
        badge: "Mars"
    },
    "venus": {
        id: COSMOS_DIMENSIONS.VENUS,
        name: "Venus",
        subtitle: "Cytherean Atmospheric Outpost",
        badge: "Venus"
    },
    "asteroids": {
        id: COSMOS_DIMENSIONS.ASTEROIDS,
        name: "Asteroids",
        subtitle: "Microgravity Kuiper / Asteroid Belt",
        badge: "Asteroids"
    },
    "asteroid": {
        id: COSMOS_DIMENSIONS.ASTEROIDS,
        name: "Asteroids",
        subtitle: "Microgravity Kuiper / Asteroid Belt",
        badge: "Asteroids"
    },
    "stations": {
        id: COSMOS_DIMENSIONS.SPACE_STATIONS,
        name: "Space Station",
        subtitle: "Orbital Research Laboratory",
        badge: "Space Station"
    },
    "space_stations": {
        id: COSMOS_DIMENSIONS.SPACE_STATIONS,
        name: "Space Station",
        subtitle: "Orbital Research Laboratory",
        badge: "Space Station"
    },
    "station": {
        id: COSMOS_DIMENSIONS.SPACE_STATIONS,
        name: "Space Station",
        subtitle: "Orbital Research Laboratory",
        badge: "Space Station"
    }
};

/**
 * Returns formatted human-readable name of dimension.
 * @param {string} dimId
 * @returns {string}
 */
export function formatDimensionName(dimId) {
    switch (dimId) {
        case "minecraft:overworld": return "Overworld (Earth)";
        case "minecraft:nether": return "Nether";
        case "minecraft:the_end": return "The End";
        case "cosmos:moon": return "Moon";
        case "cosmos:mars": return "Mars";
        case "cosmos:venus": return "Venus";
        case "cosmos:asteroids": return "Asteroids Belt";
        case "cosmos:space_stations": return "Space Station";
        default: return dimId.replace("cosmos:", "").toUpperCase();
    }
}

/**
 * Displays the interactive Korolev Navigation ActionFormData modal.
 * @param {import("@minecraft/server").Player} player
 */
export function showKorolevNavigator(player) {
    if (!player) return;

    const currentDimId = player.dimension?.id || "minecraft:overworld";
    const currentDimName = formatDimensionName(currentDimId);

    const options = [
        { key: "overworld", label: "Overworld (Earth)\nSurface Biosphere" },
        { key: "moon", label: "Moon\nLow Gravity & Regolith" },
        { key: "mars", label: "Mars\nAtmosphere & Caverns" },
        { key: "venus", label: "Venus\nExtreme Heat & Pressure" },
        { key: "asteroids", label: "Asteroids\nMicrogravity Void Belt" },
        { key: "stations", label: "Space Station\nOrbital Research Outpost" }
    ];

    const form = new ActionFormData()
        .title("KOROLEV NAVIGATOR")
        .body(`Current Dimension: ${currentDimName}\nSelect target planetary body to initiate warp jump:`);

    for (const opt of options) {
        form.button(opt.label);
    }

    form.show(player).then((response) => {
        if (response.canceled) return;
        const selected = options[response.selection];
        if (selected) {
            executeKorolevTeleport(player, selected.key);
        }
    }).catch(() => {});
}

/**
 * Executes safe dimension teleportation to target planet with status damping and chunk prep.
 * @param {import("@minecraft/server").Player} player
 * @param {string} targetInput Destination keyword or dimension ID
 * @returns {Promise<boolean>}
 */
export async function executeKorolevTeleport(player, targetInput) {
    if (!player) return false;

    if (!targetInput || typeof targetInput !== "string") {
        showKorolevNavigator(player);
        return true;
    }

    const cleanInput = targetInput.trim().toLowerCase();
    const dest = KOROLEV_DESTINATIONS[cleanInput];

    if (!dest) {
        player.sendMessage(`[Korolev] Unknown planetary target: "${targetInput}".`);
        player.sendMessage(`Valid destinations: overworld, moon, mars, venus, asteroids, stations.`);
        try {
            player.playSound("note.bass", { pitch: 0.8, volume: 1.0 });
        } catch (e) {}
        return false;
    }

    let targetDim;
    try {
        targetDim = world.getDimension(dest.id);
    } catch (e) {
        targetDim = null;
    }

    if (!targetDim) {
        player.sendMessage(`[Korolev] Dimension "${dest.id}" is currently unreachable.`);
        return false;
    }

    // Dismount player if riding
    try {
        const riding = player.getComponent?.("minecraft:riding");
        if (riding && riding.entityRidingOn) {
            player.runCommand("dismount");
        }
    } catch (e) {}

    player.sendMessage(`[Korolev] Calculating orbital vector to ${dest.name}...`);

    try {
        const spawnCoords = await ensureDimensionSpawn(targetDim);
        await teleportPlayerSafely(player, targetDim, spawnCoords);

        player.sendMessage(`[Korolev] Warp jump to ${dest.name} complete! Coordinates: ${Math.floor(spawnCoords.x)}, ${Math.floor(spawnCoords.y)}, ${Math.floor(spawnCoords.z)}`);

        try {
            if (typeof player.onScreenDisplay?.setTitle === "function") {
                player.onScreenDisplay.setTitle(dest.name.toUpperCase(), {
                    subtitle: dest.subtitle,
                    fadeInDuration: 10,
                    stayDuration: 40,
                    fadeOutDuration: 10
                });
            }
        } catch (e) {}

        try {
            player.playSound("portal.travel", { pitch: 1.2, volume: 1.0 });
        } catch (e) {}

        return true;
    } catch (err) {
        player.sendMessage(`[Korolev] Jump failure: ${err?.message || err}`);
        return false;
    }
}

/**
 * Registers all Korolev dimension navigation commands and enums.
 * @param {import("@minecraft/server").CustomCommandRegistry} customCommandRegistry
 */
export function registerKorolev(customCommandRegistry) {
    if (!customCommandRegistry) return;

    const enumValues = [
        "overworld",
        "moon",
        "mars",
        "venus",
        "asteroids",
        "stations",
        "space_stations",
        "earth"
    ];

    try {
        customCommandRegistry.registerEnum("cosmos:dimension_target", enumValues);
    } catch (e) {}

    try {
        customCommandRegistry.registerEnum("korolev:dimension_target", enumValues);
    } catch (e) {}

    const commandHandler = (origin, ...rawArgs) => {
        const player = origin.sourceEntity || origin.initiator;
        if (!player || player.typeId !== "minecraft:player") return;

        const args = (rawArgs.length === 1 && Array.isArray(rawArgs[0])) ? rawArgs[0] : rawArgs;
        let target = args[0];
        if (typeof target === "object" && target !== null && target.name) {
            target = target.name;
        }

        system.run(() => {
            if (!target || typeof target !== "string" || target.trim().length === 0) {
                showKorolevNavigator(player);
            } else {
                executeKorolevTeleport(player, target);
            }
        });
    };

    // Primary command: cosmos:korolev
    try {
        customCommandRegistry.registerCommand({
            name: "cosmos:korolev",
            description: "Korolev Interplanetary Warp: Teleport between dimensions or open the navigator menu.",
            cheatsRequired: false,
            permissionLevel: 0,
            optionalParameters: [
                { type: "Enum", name: "cosmos:dimension_target" }
            ]
        }, commandHandler);
    } catch (e) {}

    // Direct command aliases: korolev:teleport, korolev:tp, korolev:korolev
    try {
        customCommandRegistry.registerCommand({
            name: "korolev:teleport",
            description: "Korolev Warp: Teleport to a planetary dimension.",
            cheatsRequired: false,
            permissionLevel: 0,
            optionalParameters: [
                { type: "Enum", name: "korolev:dimension_target" }
            ]
        }, commandHandler);
    } catch (e) {}

    try {
        customCommandRegistry.registerCommand({
            name: "korolev:tp",
            description: "Korolev Warp: Quick teleport to a planetary dimension.",
            cheatsRequired: false,
            permissionLevel: 0,
            optionalParameters: [
                { type: "Enum", name: "korolev:dimension_target" }
            ]
        }, commandHandler);
    } catch (e) {}

    try {
        customCommandRegistry.registerCommand({
            name: "korolev:korolev",
            description: "Korolev Interplanetary Warp.",
            cheatsRequired: false,
            permissionLevel: 0,
            optionalParameters: [
                { type: "Enum", name: "korolev:dimension_target" }
            ]
        }, commandHandler);
    } catch (e) {}
}
