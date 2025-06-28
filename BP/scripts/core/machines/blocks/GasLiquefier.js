import { system } from "@minecraft/server";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"

export default class {
  constructor(entity, block) {
    this.entity = entity;
    this.block = block;
    if (entity.isValid) {
      this.liquefyGas();
    }
  }

  
  liquefyGas() {
    //makes snow particles that fall on the sides
    //oxygen gas into liquid oxygen
    //nitrogen gas into liuquid nitrogen
    //methane into fuel
    //liquid nitrogen from overworld air
    //mars Co2 into liquid argon
    // venus has Co2(for MS) and Nitrogen(for GL)
  }
}
