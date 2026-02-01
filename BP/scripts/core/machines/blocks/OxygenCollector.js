import { system, world, BlockVolume, ItemStack } from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { output_fluid } from "../../matter/fluids";

const valid_oxygen_blocks = [
    "minecraft:oak_leaves",
    "minecraft:spruce_leaves",
    "minecraft:birch_leaves",
    "minecraft:jungle_leaves", 
    "minecraft:acacia_leaves", 
    "minecraft:dark_oak_leaves"
];

export default class {
    constructor(entity, block) {
        this.entity = entity;
        this.block = block;
        
        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.energy = vars.energy || 0;
        this.o2 = vars.o2 || 0;
        
        this.lastUiUpdate = 0;
    }

    onPlace() {
        if (this.block.dimension.id === "minecraft:the_end") {
            const { x, y, z } = this.block.location;
            let block_number = 0;
            try {
                const blocks = this.block.dimension.getBlocks(
                    new BlockVolume({ x: x + 5, y: y + 5, z: z + 5 }, { x: x - 5, y: y - 5, z: z - 5 }),
                    { includeTypes: valid_oxygen_blocks }
                );
                for (const location of blocks.getBlockLocationIterator()) {
                    block_number++;
                }
            } catch (e) {}
            this.entity.setDynamicProperty("cosmos_oxygen_source", block_number);
        }
    }

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

        const dimension = this.entity.dimension.id;
        const data = get_data(this.entity);
        const container = this.entity.getComponent('minecraft:inventory').container;

        // Fluid output
        for (let i = 0; i < dt; i++) {
            this.o2 = output_fluid("o2", this.entity, this.block, this.o2);
        }

        // Oxygen Collection Logic
        let oxygen_source_bloks = this.entity.getDynamicProperty("cosmos_oxygen_source") || 0;
        if (dimension === "minecraft:overworld") oxygen_source_bloks = 93;

        if (this.energy > 0) {
            // Original: o2 += Math.floor(0.75 * leaves) every 10 ticks
            const collectionTicks = Math.floor(dt / 10) || (dt > 0 && Math.random() < dt/10 ? 1 : 0);
            if (collectionTicks > 0) {
                this.o2 += Math.floor(0.75 * oxygen_source_bloks) * collectionTicks;
                this.o2 = Math.min(this.o2, data["o2"].capacity);
            }
        }

        // Energy management
        for (let i = 0; i < dt; i++) {
            this.energy = charge_from_machine(this.entity, this.block, this.energy);
            this.energy = charge_from_battery(this.entity, this.energy, 0);
            this.energy = Math.max(0, this.energy - 10);
        }

        // Status & UI
        const status = this.energy === 0 ? "§4Not Enough Power" :
            (oxygen_source_bloks < 2 && dimension !== "minecraft:overworld") ? "§4Not Enough Leaf Blocks" :
            "§2Active";
        
        save_dynamic_object(this.entity, { energy: Math.floor(this.energy), o2: Math.floor(this.o2) }, "machine_data");

        if (!container.getItem(1) || system.currentTick - this.lastUiUpdate > 20) {
            const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
            const oxygen_hover = `Oxygen Storage\n§aOxygen: ${Math.floor(this.o2)}/${data["o2"].capacity}`;
            
            container.add_ui_display(1, energy_hover, Math.round((this.energy / data.energy.capacity) * 55));
            container.add_ui_display(2, oxygen_hover, Math.round((this.o2 / data["o2"].capacity) * 55));
            container.add_ui_display(3, '§rStatus: ' + status);
            container.add_ui_display(4, `§rCollecting: §r${this.energy > 0 ? oxygen_source_bloks : 0}/s`);
            this.lastUiUpdate = system.currentTick;
        }
    }
}

// Keep event listeners for leaf blocks
world.afterEvents.playerPlaceBlock.subscribe((data) => {
    if (data.block.dimension.id === "minecraft:the_end" && /minecraft:.+_leaves/.test(data.block.typeId)) {
        find_oxygen(data.block, false);
    }
});
world.afterEvents.playerBreakBlock.subscribe((data) => {
    if (data.block.dimension.id === "minecraft:the_end" && /minecraft:.+_leaves/.test(data.brokenBlockPermutation.type.id)) {
        find_oxygen(data.block, true);
    }
});

function find_oxygen(block, must_delete) {
    const collectors = block.dimension.getEntities({ location: block.location, maxDistance: 5, type: "cosmos:oxygen_collector" });
    collectors.forEach(collector => {
        const leaves = collector.getDynamicProperty("cosmos_oxygen_source") || 0;
        const number_of_leaves = must_delete ? Math.max(0, leaves - 1) : leaves + 1;
        collector.setDynamicProperty("cosmos_oxygen_source", number_of_leaves);
    });
}
