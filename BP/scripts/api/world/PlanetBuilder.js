/**
 * PlanetBuilder - Legacy End cleaner deprecation
 * Custom dimensions natively generate in pure void substrate;
 * The legacy end cleaner is maintained as a safe no-op for backward compatibility.
 */
import { world } from "@minecraft/server";

export const end_cleaner_component = {
    onTick({ block }) {
        try {
            // Replace legacy cleaner block with natural turf or air
            const below = block.below();
            if (below && below.isValid && below.typeId !== "cosmos:end_cleaner") {
                block.setType(below.typeId);
            } else {
                block.setType("minecraft:air");
            }
        } catch (e) {}
    }
};