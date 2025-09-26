import {world, system} from "@minecraft/server";
import {detach_wires, attach_to_wires} from "../blocks/aluminum_wire"
import {machine_entities} from "../machines/Machine"

const directions = ["north", "east", "south", "west"]

function rotate(block, perm) {
  const direction = perm.getState("minecraft:cardinal_direction")
  const turn_to = directions[directions.indexOf(direction) + 1] ?? "north"
	block.setPermutation(perm.withState("minecraft:cardinal_direction", turn_to))
	system.runTimeout(()=>{
    detach_wires(block)
    attach_to_wires(block)
  }, 1)
}

export function remove(block) {
  detach_wires(block)
  const {dimension, location} = block
  const coords = `${location.x} ${location.y} ${location.z}`
  const machineEntity = dimension.getEntities({
    type: block.permutation.type.id,
    location: {
        x: Math.floor(block.location.x) + 0.5,
        y: Math.floor(block.location.y) + 0.5,
        z: Math.floor(block.location.z) + 0.5,
    },
    maxDistance: 0.5,})[0];
    dimension.runCommand(`fill ${coords} ${coords} air destroy`)
    if(machineEntity){
      machine_entities.delete(machineEntity.id);
      const container = machineEntity.getComponent('minecraft:inventory')?.container;
      if (container) {
        for (let i = 0; i < container.size; i++) {
          const itemId = container.getItem(i)?.typeId;
          if (!['cosmos:ui', 'cosmos:ui_button'].includes(itemId)) continue;
          container.setItem(i);
        }
      }
      machineEntity?.runCommand('kill @s');
      machineEntity?.remove();
    }

}

system.beforeEvents.startup.subscribe(({itemComponentRegistry}) => {
    itemComponentRegistry.registerCustomComponent("cosmos:wrench", {
        onUseOn({block, source:player, usedOnBlockPermutation:perm}){
          if (!block.hasTag("machine")) return
          if (player.isSneaking) remove(block)
          else rotate(block, perm)
        }
    })
})
