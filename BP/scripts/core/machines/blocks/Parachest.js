import { system, world, BlockPermutation } from "@minecraft/server";
import { rocket_nametags } from "../../../api/player/liftoff";
import { load_to_item } from "../../matter/fluids";
import { load_machine_data, save_machine_data } from "../../../api/utils";

const Parachest = {
  has_entity: true,
	drops_entity_items: true,
  onTick(parachest) {
    if(system.currentTick % 20) return;
    let entity = world.getEntity(parachest.getComponent("minecraft:dynamic_properties").get("entity_id"))
    let inventory = entity.getComponent('minecraft:inventory');
    let container = inventory.container;
    let fuel = load_machine_data(parachest)?.fuel || 0;
    if(fuel > 0){
      fuel = load_to_item(fuel, "fuel", container, 1);
      save_machine_data(parachest, {fuel})
    }
    container.add_ui_display(inventory.inventorySize - 4, "", Math.ceil((Math.ceil(fuel/26))))
  },
  
  onPlace(block){
    let entity = block.dimension.spawnEntity(block.typeId, block.bottomCenter());
    block.getComponent("minecraft:dynamic_properties").set("entity_id", entity.id);
    entity.triggerEvent('cosmos:inv' + 0);
    entity.nameTag = '§f§u§e§l§_§c§h§e§s§t§' + rocket_nametags[0];
  },

  place(fuel, dimension, parachest_loc, inventory_size, parachute_color) {
    let parachest = dimension.getBlock(parachest_loc);
    parachest.setPermutation(BlockPermutation.resolve("cosmos:parachest", {"cosmos:parachute": parachute_color ?? 11}));

    let entity = dimension.spawnEntity("cosmos:parachest", parachest.bottomCenter())
    parachest.getComponent("minecraft:dynamic_properties").set("entity_id", entity.id);
    entity.triggerEvent('cosmos:inv' + inventory_size);
    entity.nameTag = '§f§u§e§l§_§c§h§e§s§t§' + rocket_nametags[inventory_size];
    save_machine_data(parachest, {fuel});
    return entity;
  },

}; export default Parachest

world.afterEvents.entityHitEntity.subscribe((event) => {
  if(event.hitEntity?.typeId != "cosmos:parachest") return;

  let entity = event.hitEntity;
  const coords = `${entity.location.x} ${entity.location.y} ${entity.location.z}`;
  entity.dimension.runCommand(`fill ${coords} ${coords} air destroy`);

  entity.kill();
  entity.remove();
}, {entityTypes: ["minecraft:player"]});