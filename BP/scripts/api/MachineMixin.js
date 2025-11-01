import * as mc from "@minecraft/server";
/**
   * "MachineLib" Mixin injector by Refracted
   * NOTE : THIS MIXIN IS NOT IMPORTED ANYWHERE IN THE GAME, DO NOT BLAME ME ON THIS
   *
   * UI elements are updated by passing an array of config objects. Each config object should have:
   *   - slot: (number) the container slot to update
   *   - text: (string or function) the text to display; if a function, it receives a machineData object
   *   - lore: (optional, array or function) additional text lines; if a function, it receives machineData
   *
   * In addition, the library provides energy management methods so you can get, set, add, or subtract energy.
   */

const { ItemStack } = mc;
//@ts-expect-error
Merge(mc.Container.prototype, {

  add_ui_button(slot, text, lore) {
    const button = new ItemStack('cosmos:ui_button')
    button.nameTag = text ?? ''
    if (lore) button.setLore(lore)
    super.setItem(slot, button)
  },

  add_ui_display(slot, text, damage) {
    const button = new ItemStack('cosmos:ui')
    if (damage) {
      const durability = button.getComponent('durability')
      durability.damage = durability.maxDurability - damage
    }
    button.nameTag = text ?? ''
    super.setItem(slot, button)
  },

  updateUI(uiConfigs, data) {
    uiConfigs.forEach(config => {
      const uiItem = new ItemStack('cosmos:ui');
      const text = (typeof config.text === 'function')
        ? config.text(data)
        : (config.text || "");
      uiItem.nameTag = `cosmos:${text}`;
      if (config.lore) {
        const lore = (typeof config.lore === 'function')
          ? config.lore(data)
          : config.lore;
        uiItem.setLore(lore);
      }
      super.setItem(config.slot, uiItem);
    });
  },

  addProgressBar(slotIndex) {
    // Create a progress bar with an initial value of 0.
    const progressBar = { slotIndex, value: 0 };
    (this._progressBars ??= {})[slotIndex] = progressBar;

    // Get the container slot.
    const slot = this.getSlot(slotIndex);
    if (slot.hasItem()) {
      slot.nameTag = "0";
    } else {
      const item = new ItemStack("minecraft:barrier", 1);
      item.nameTag = "0";
      this.setItem(slotIndex, item);
    }
    return progressBar;
  },

  getOrCreateProgressBar(slotIndex) {
    return (this._progressBars ??= {})[slotIndex] || this.addProgressBar(slotIndex);
  },

  getProgressBar(slotIndex) {
    // Return the stored progress bar if it exists.
    if (this._progressBars && this._progressBars[slotIndex]) {
      return this._progressBars[slotIndex];
    }
    // Attempt to derive a progress bar from the slot's item.
    const slot = this.getSlot(slotIndex);
    if (slot && slot.hasItem() && typeof slot.nameTag === 'string') {
      // Try to parse the nameTag as an integer.
      const value = parseInt(slot.nameTag, 10);
      if (!isNaN(value)) {
        // Clamp the progress value between 0 and 9.
        const progressValue = Math.max(0, Math.min(9, value));
        const progressBar = { slotIndex: slotIndex, value: progressValue };
        // Ensure our progressBars store exists.
        // Save and return the derived progress bar.
        (this._progressBars ??= {})[slotIndex] = progressBar;
        return progressBar;
      }
    }

    // If nothing found, return null.
    return null;
  },

  setProgressBar(slotIndex, value) {
    const progressBar = this.getProgressBar(slotIndex);
    if (!progressBar) {
      console.warn(`Progress bar at slot ${slotIndex} not found.`);
      return;
    }

    // Clamp value between 0 and 9.
    progressBar.value = Math.max(0, Math.min(9, value));

    // Update the slot's visual indicator.
    const slot = this.getSlot(slotIndex);
    if (slot.hasItem()) {
      slot.nameTag = String(progressBar.value);
    } else {
      console.warn(`Slot ${slotIndex} is empty.`);
    }
  }

});