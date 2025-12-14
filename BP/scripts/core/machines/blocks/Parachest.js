import { system, BlockPermutation } from "@minecraft/server";
import { rocket_nametags } from "../../../api/player/liftoff";
import { machine_entities } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils";

export default class {
    constructor(entity, block) {
		this.entity = entity;
		this.block = block;
        if (entity.isValid) this.parachest;
    }
    onPlace(){
      place_parachest(0, undefined, undefined, 0, undefined, this.entity)
    }
    parachest() {
		if(system.currentTick % 10) return;
        let parachest = this.entity;
        let inventory = parachest.getComponent('minecraft:inventory');
        let container = inventory.container;
        let fuel = load_dynamic_object(lander, "machine_data")?.fuel || 0;
        container.add_ui_display(inventory.inventorySize - 4, "", Math.ceil((Math.ceil(fuel/26))))
	}
}

//takes location or entity
export function place_parachest(fuel, dimension, parachest_loc, inventory_size, parachute_color, parachest = undefined){
  if(!parachest){
    dimension.getBlock(parachest_loc).setPermutation(BlockPermutation.resolve("cosmos:parachest", {"cosmos:parachute": parachute_color ?? 11}))
    let parachest_block = dimension.spawnEntity("cosmos:parachest", parachest_loc)
      
    const machine_name = parachest_block.typeId.replace('cosmos:', '');
    machine_entities.set(parachest_block.id, { type: machine_name, location: parachest_block.location});
    parachest_block.triggerEvent('cosmos:inv' + inventory_size);
    parachest_block.nameTag = '§f§u§e§l§_§c§h§e§s§t§' + rocket_nametags[inventory_size];
    save_dynamic_object(parachest_block, {fuel}, "machine_data")
    return parachest_block;
  }

  parachest.triggerEvent('cosmos:inv' + inventory_size);
  parachest.nameTag = '§f§u§e§l§_§c§h§e§s§t§' + rocket_nametags[inventory_size];
  save_dynamic_object(parachest, {fuel}, "machine_data")
}