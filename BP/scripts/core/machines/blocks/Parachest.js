import { system, BlockPermutation } from "@minecraft/server";
import { rocket_nametags } from "../../../api/player/liftoff";
import { machine_entities, machineManager } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils";

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        
        const vars = load_dynamic_object(this.entity, "machine_data") || {};
        this.fuel = vars.fuel || 0;
        this.lastUiUpdate = 0;
    }

    onPlace() {
      place_parachest(0, undefined, undefined, 0, undefined, this.entity);
    }

    /**
     * @param {number} dt 
     */
    tick(dt = 1) {
        if (!this.entity.isValid) return;

        // UI update every 10 ticks
        if (system.currentTick - this.lastUiUpdate > 10) {
            const inventory = this.entity.getComponent('minecraft:inventory');
            if (inventory) {
                const container = inventory.container;
                const vars = load_dynamic_object(this.entity, "machine_data") || {};
                const fuel = vars.fuel || 0;
                
                // Always ensure UI display is present (cleared by manager if taken)
                container.add_ui_display(container.size - 4, "", Math.ceil(fuel / 26));
            }
            this.lastUiUpdate = system.currentTick;
        }
	}
}

//takes location or entity
export function place_parachest(fuel, dimension, parachest_loc, inventory_size, parachute_color, parachest = undefined){
  if (!parachest) {
    dimension.getBlock(parachest_loc).setPermutation(BlockPermutation.resolve("cosmos:parachest", {"cosmos:parachute": parachute_color ?? 11}));
    let parachest_block = dimension.spawnEntity("cosmos:parachest", { x: parachest_loc.x + 0.5, y: parachest_loc.y + 0.5, z: parachest_loc.z + 0.5 });
      
    // The MachineManager handles registration via entityLoad or explicit register call
    if (machineManager) machineManager.register(parachest_block);
    
    parachest_block.triggerEvent('cosmos:inv' + inventory_size);
    parachest_block.nameTag = '§f§u§e§l§_§c§h§e§s§t§' + rocket_nametags[inventory_size];
    save_dynamic_object(parachest_block, {fuel}, "machine_data");
    return parachest_block;
  }

  parachest.triggerEvent('cosmos:inv' + inventory_size);
  parachest.nameTag = '§f§u§e§l§_§c§h§e§s§t§' + (rocket_nametags[inventory_size] || "");
  save_dynamic_object(parachest, {fuel}, "machine_data");
}
