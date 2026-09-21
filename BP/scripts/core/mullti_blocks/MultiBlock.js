import {system, world, ItemStack} from "@minecraft/server";
import AllMultiBlocks from "./AllMultiBlocks";

export let multi_blocks = new Map();

function reload_mullti_block(entity){
    if (!Object.keys(AllMultiBlocks).includes(entity.typeId) || multi_blocks.has(entity.id)) return;
    const dynamic_object = JSON.parse(entity.getDynamicProperty("multi_block_data") ?? "{}");
    multi_blocks.set(entity.id, { entity_data: dynamic_object });
}

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    reload_mullti_block(entity);
});

world.afterEvents.worldLoad.subscribe(() => {
    world.getDims(dimension => dimension.getEntities({includeFamilies: ['multi_block']})).forEach(entity => {reload_mullti_block(entity)});
    system.runInterval(() => {
        if (multi_blocks.size === 0) return;
        multi_blocks.forEach((multiBlockData, entityId) => {
            const multi_block = world.getEntity(entityId);
            if(!multi_block?.isValid) return;
            const data = AllMultiBlocks[multi_block.typeId];
            data.onTick(multi_block)
        });
    });
});

export const multi_block_component = {
	beforeOnPlayerPlace(event) {
		const { block, permutationToPlace: perm } = event;
		const multu_block_object = AllMultiBlocks[perm.type.id];

        system.run(() => {
            const entity = multu_block_object?.onPlace(event);
            if(!entity) return;
            entity.nameTag = multu_block_object.ui;
            const dynamic_object = JSON.parse(entity.getDynamicProperty("multi_block_data") ?? "{}");
            multi_blocks.set(entity.id, { entity_data: dynamic_object });
        });
	},
	onPlayerBreak(event) {
        const { block, dimension, brokenBlockPermutation: perm } = event;
        const multu_block_object = AllMultiBlocks[perm.type.id];
        const entity = multu_block_object?.onBreak(event);
        if(!entity) return;

		multi_blocks.delete(entity.id);
        const container = entity.getComponent('minecraft:inventory')?.container;
        if (container) {
            for (let i = 0; i < container.size; i++) {
                const itemId = container.getItem(i)?.typeId;
                if (!['cosmos:ui', 'cosmos:ui_button'].includes(itemId)) continue;
                container.setItem(i);
            }
        }
        entity.kill(); // kill to make it drop the items
        entity.remove();
	},
}

export function get_multi_block_data(multi_block){
    return AllMultiBlocks[multi_block.typeId];
}