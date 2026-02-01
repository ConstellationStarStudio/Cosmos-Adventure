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
    
    // Persistent state initialization
    const vars = load_dynamic_object(this.entity, "machine_data") || {};
    this.burnTime = vars.burnTime || 0;
    this.heat = vars.heat || 0;
    this.power = vars.power || 0;
    
    this.lastUiUpdate = 0;
  }

  onPlace(){}

  /**
   * Main logic loop called by MachineManager.
   * @param {number} dt Delta time in ticks.
   */
  tick(dt = 1) {
    if (!this.entity.isValid) return;

    const container = this.entity.getComponent('minecraft:inventory').container;
    const fuelItem = container.getItem(0);
    const isCoalBlock = fuelItem?.typeId === 'minecraft:coal_block';

    let stateChanged = false;

    // 1. Fuel Consumption
    if (this.burnTime === 0 && fuelTypes.has(fuelItem?.typeId)) {
      container.setItem(0, fuelItem.decrementStack());
      this.burnTime = isCoalBlock ? 3200 : 320;
      stateChanged = true;
    }

    if (this.burnTime > 0) {
      const consumption = Math.min(this.burnTime, dt);
      this.burnTime -= consumption;
      stateChanged = true;
    }

    // 2. Heat Logic
    if (this.burnTime > 0) {
      if (this.heat < 100) {
        this.heat = Math.min(100, this.heat + dt);
        stateChanged = true;
      }
    } else {
      if (this.heat > 0 && this.power === 0) {
        this.heat = Math.max(0, this.heat - dt);
        stateChanged = true;
      }
    }

    // 3. Power Generation
    if (this.burnTime > 0 && this.heat === 100) {
      // Approximating "burnTime % 3 === 0" with dt
      const powerGain = Math.floor(dt / 3) || (dt > 0 && Math.random() < dt/3 ? 1 : 0);
      if (powerGain > 0 && this.power < 120) {
        this.power = Math.min(120, this.power + powerGain);
        stateChanged = true;
      }
    } else if (this.burnTime === 0 && this.power > 0) {
      const powerLoss = Math.floor(dt / 3) || (dt > 0 && Math.random() < dt/3 ? 1 : 0);
      if (powerLoss > 0) {
        this.power = Math.max(0, this.power - powerLoss);
        stateChanged = true;
      }
    }

    // 4. UI Update & Persistence
    const needsUiRefresh = !container.getItem(1);
    if (stateChanged || needsUiRefresh || system.currentTick - this.lastUiUpdate > 20) {
      save_dynamic_object(this.entity, {
        burnTime: Math.floor(this.burnTime),
        heat: Math.floor(this.heat),
        power: Math.floor(this.power)
      }, "machine_data");

      const display_text = `§r${this.power == 0 ? 'Not Generating' : '   Generating'}\n${this.power == 0 ? ` Hull Heat: ${this.heat}%%` : `     §r${this.power} gJ/t`}`;
      container.add_ui_display(1, display_text);
      this.lastUiUpdate = system.currentTick;
    }

    // Active if burning, has heat/power to dissipate, or has fuel to consume
    return this.burnTime > 0 || this.heat > 0 || this.power > 0 || (fuelTypes.has(fuelItem?.typeId) && this.burnTime === 0);
  }
}