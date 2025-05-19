import * as mc from "@minecraft/server";
import { compare_lists, load_dynamic_object, save_dynamic_object } from "../../../api/utils";

const { system } = mc;

const fuelTypes = new Set(["minecraft:coal", "minecraft:charcoal", "minecraft:coal_block"]);

export default class {
  /**
   * @param {mc.Entity} entity  
   * @param {mc.Block} block 
   */
  constructor(entity, block) {
    this.entity = entity;
    this.block = block;
    if (entity.isValid()) {
      this.generateHeat();
    }
  }
  
  onPlace() {
    const container = this.entity.getComponent('minecraft:inventory').container;
    // Initialize UI elements
    container.updateUI(
      [
        { slot: 1, text: data => data.power === 0 ? 'Not Generating' : 'Generating' },
        { slot: 2, text: data => data.power === 0 ? (' Hull Heat: ' + data.heat + '%%') : ('  §r' + data.power + ' gJ/t') }
      ],
      { heat: 0, power: 0 }
    );
  }
  
  generateHeat() {
    const e = this.entity;
    const container = e.getComponent('minecraft:inventory').container;
    const fuelItem = container.getItem(0);
    const isCoalBlock = fuelItem?.typeId === 'minecraft:coal_block';
    
    
    const variables = load_dynamic_object(this.entity, 'machine_data')
    let burnTime = variables.burnTime || 0
    let heat = variables.heat || 0
    let power = variables.power || 0

    const first_burnTime = burnTime;
    const first_heat = heat;
    const first_power = power;
    if (fuelTypes.has(fuelItem?.typeId) && burnTime === 0) {
      container.setItem(0, fuelItem.decrementStack());
      burnTime = isCoalBlock ? 3200 : 320;
    }
    if (burnTime > 0) burnTime--;
    
    // Adjust heat and power based on burnTime.
    if (burnTime > 0 && heat < 100) heat++;
    if (burnTime === 0 && heat > 0 && power === 0) heat--;
    if (burnTime > 0 && heat === 100 && burnTime % 3 === 0 && power < 120) power++;
    if (burnTime === 0 && system.currentTick % 3 === 0 && power > 0) power--;
    
    // Save and Update UI
    if (!compare_lists([heat, burnTime, power], [first_heat, first_burnTime, first_power])){
      save_dynamic_object(this.entity, 'machine_data', {burnTime, heat, power})
      const display_text = `§r${power == 0 ? 'Not Generating' : '   Generating'}\n${power == 0 ? ` Hull Heat: ${heat}%%` : `     §r${power} gJ/t`}`
      container.add_ui_display(1, display_text)
    }
  }
}
