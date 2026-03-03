import { system } from "@minecraft/server"
import { save_dynamic_object, load_dynamic_object} from "../../../api/utils";

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
        let fuel = load_dynamic_object(lander, "vehicle_data")?.fuel || 0;
        container.add_ui_display(inventory.inventorySize - 4, "", Math.ceil((Math.ceil(fuel/26))))
    }
}