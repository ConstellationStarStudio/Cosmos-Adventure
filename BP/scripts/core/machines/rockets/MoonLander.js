import { system, world} from "@minecraft/server"
import { dismount} from "../../../api/player/liftoff";

export default class{
    constructor(entity, block) {
        this.entity = entity;
        this.block = block;
        if (entity.isValid) this.lander();
    }
    lander(){
        if(system.currentTick % 10) return;
        let lander = this.entity;
        let inventory = lander.getComponent('minecraft:inventory');
        let container = inventory.container;
        let fuel = lander.getDynamicProperty("fuel_level") || 0;
        container.add_ui_display(inventory.inventorySize - 4, "", Math.ceil((Math.ceil(fuel/26))))
    }
}