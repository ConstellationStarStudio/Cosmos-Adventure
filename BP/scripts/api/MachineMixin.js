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




/**
   * Adds a progress bar to the specified slot.
   * If the slot is empty, it assigns a barrier ItemStack with nameTag "0".
   * If an item already exists, its value is set to "0".
   * @param {number} slotIndex - The index of the slot.
   * @returns {object} The progress bar object.
   */
Container.prototype.addProgressBar = function(slotIndex) {
 // Create a progress bar with an initial value of 0.
 const progressBar = { slotIndex: slotIndex, value: 0 };
 this._progressBars[slotIndex] = progressBar;
 
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
};

/**
* Retrieves an existing progress bar for the given slot index,
* or creates one if it does not exist.
* @param {number} slotIndex - The index of the slot.
* @returns {object} The progress bar object.
*/
Container.prototype.getOrCreateProgressBar = function(slotIndex) {
 return this._progressBars[slotIndex] || this.addProgressBar(slotIndex);
};

Container.prototype.getProgressBar = function(slotIndex) {
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
        if (!this._progressBars) {
          this._progressBars = {};
        }
        // Save and return the derived progress bar.
        this._progressBars[slotIndex] = progressBar;
        return progressBar;
      }
    }
    
    // If nothing found, return null.
    return null;
  };

/**
* Sets the progress value (clamped between 0 and 9) for the progress bar
* at the given slot, and updates the slot's value.
* @param {number} slotIndex - The index of the slot.
* @param {number} value - New progress value (0-9).
*/
Container.prototype.setProgressBar = function(slotIndex, value) {
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
};
