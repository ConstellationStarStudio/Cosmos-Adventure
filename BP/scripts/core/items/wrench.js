import {world, system} from "@minecraft/server";
import {detach_wires, attach_to_wires} from "../blocks/aluminum_wire"
import { attach_to_machine, attach_pipes, detach_pipes } from "../blocks/fluid_pipe";
import { rotate_base } from "../mullti_blocks/blocks/MinerBase";
import { get_data } from "../machines/Machine";

const directions = ["north", "east", "south", "west"]

function rotate(block, perm) {
  const direction = perm.getState("minecraft:cardinal_direction")
  const turn_to = directions[directions.indexOf(direction) + 1] ?? "north"
	block.setPermutation(perm.withState("minecraft:cardinal_direction", turn_to))
	system.runTimeout(()=>{
    detach_wires(block)
    attach_to_wires(block)
    detach_pipes(block, block.permutation, undefined, "machine")
    attach_pipes(block)
  }, 1)
}

export function remove(block) {
  detach_wires(block)
  detach_pipes(block, block.permutation, undefined, "machine")
  const {dimension, location} = block
  const coords = `${location.x} ${location.y} ${location.z}`
  let data = get_data(block);

  if(data?.visual_entity){
    let entity = dimension.getEntities({type: block.typeId, location: { x: Math.floor(block.location.x) + 0.5, y: Math.floor(block.location.y) + 0.5,
		z: Math.floor(block.location.z) + 0.5, }, maxDistance: 0.5,})[0];

		if(entity) entity.remove();
  }

  dimension.runCommand(`fill ${coords} ${coords} air destroy`)
}

export const wrench_component = {
  onUseOn({block, source:player, usedOnBlockPermutation:perm}){
    rotate_base(block, perm);
    if (block.typeId == 'cosmos:arc_lamp') {
      let direction = perm.getState("cosmos:lamp_direction");
      direction = (direction < 3)? direction + 1: 0;
      block.setPermutation(perm.withState('cosmos:lamp_direction', direction));
      return;
    }
    if(block.hasTag("fluid_pipe") && !block.hasTag("sealed_fluid_pipe")) attach_to_machine(block)
    if (!block.hasTag("machine")) return
    if (player.isSneaking) remove(block)
    else rotate(block, perm)
  }
}