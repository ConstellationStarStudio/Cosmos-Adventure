import { Container, ItemStack, system } from "@minecraft/server";

class Canister {
    static empty = 0;
    static full = 6;
    /**
     * 
     * @param {Liquid} liquid 
     */
    id;
    constructor(liquid) {
      this.id = `cosmos:${liquid.getType()}_canister_partial`;
    };
    /**
     * function for get canister id dependences from his liquid level. Empty is 0, full is 6;
     * @param {number} liquid_level 
     */
    get(liquid_level) {
        return `${this.id}_${level}`;
    };
    /**
     * function for get a canister filling from current ItemStack
     * @param {ItemStack} stack 
     */
    getFilling(stack) {
        return Number(stack.typeId.slice(-1, stack.typeId.length));
    };
    /**
     * 
     * @param {number} liquid 
     * @param {Container} container 
     * @param {number} slot 
     */
    extract(liquid_param, container, slot) {
       const canister_slot = container.getItem(slot);
       const liquid_level = this.getFilling(canister_slot);
       const liquid = container.getItem(0).getLore()[liquid_param]; 
       if(liquid >= 150 || liquid_level >= Canister.full) return;
       if(system.currentTick % 10 === 0) {
        container.setItem(slot, this.get(liquid_level+1));
        container.getItem(0).getLore()[liquid_param] = String(Number(liquid)-150);
       };
    };

    static OIL = new Canister(Liquid.OIL);
    static FUEL = new Canister(Liquid.FUEL);
} 
