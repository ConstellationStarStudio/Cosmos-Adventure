import { system } from "@minecraft/server"
import { start_countdown, dismount} from "../../../api/player/liftoff";
import { start_celestial_selector } from "../../../api/player/celestial_selector";
import { load_dynamic_object } from "../../../api/utils";

export default class{
    constructor(entity, block) {
        this.entity = entity;
        this.block = block;
        if (entity.isValid) this.rocket();
    }
    rocket(){
        if(system.currentTick % 10) return;
        let rocket = this.entity;

        const rider = rocket.getComponent('minecraft:rideable').getRiders()
        .find(rider => rider.typeId == "minecraft:player")
        const active = rocket.getDynamicProperty('active');
        const launched = rocket.getDynamicProperty("rocket_launched");
        //explode when the rocket stops after laucnching
        if (launched && rocket.getVelocity().y == 0) {
            rocket.dimension.createExplosion(rocket.location, 10, {causesFire: true, breaksBlocks: true})
            rocket.remove()
        }
        //start the celestial selector when the rocket reaches space
        if (active && rocket.location.y > 1200) {
            const current_rider = rocket.getComponent('minecraft:rideable').getRiders()
            .find(rider => rider.typeId == "minecraft:player")
            if (current_rider && !rocket.getDynamicProperty("freezed")){
                rocket.setDynamicProperty("freezed", true)
                start_celestial_selector(current_rider)
            }
        }
        let inventory = rocket.getComponent('minecraft:inventory');
        let container = inventory.container;
        if(!rider){
            container.setItem(inventory.inventorySize - 2, undefined);
            container.setItem(inventory.inventorySize - 1, undefined);
            return
        };
        let fuel = load_dynamic_object(rocket, "vehicle_data")?.fuel || 0;
        container.add_ui_display(inventory.inventorySize - 2, 'Fuel Tank. Requires\nfuel loader to fill', Math.ceil((Math.ceil(fuel/26))))
        container.add_ui_display(inventory.inventorySize - 1, "§2" + `${Math.round(fuel * 100/1000)}` + '.0%% full')
        //disable jumping
        rider.inputPermissions.setPermissionCategory(6, false)
        rider.setProperty("cosmos:is_sitting", 1);
        //camera shake
        if (active) rider.runCommand(`camerashake add @s 0.1 0.5`)
        //ignite the engine when the player jumps
        if (!active && rider.inputInfo.getButtonState("Jump") == "Pressed") {
            const space_gear = JSON.parse(rider.getDynamicProperty("space_gear") ?? '{}')
            const need_fuel = fuel <= 0 && rider.getGameMode() != "Creative"
            if (!need_fuel && (space_gear.parachute || rocket.getDynamicProperty('ready'))) {
                start_countdown(rocket, rider)
            } else if(need_fuel){
                rider.sendMessage("I'll need to load in some rocket fuel first!");
            } else {
                rider.sendMessage("You do not have a parachute.")
                rider.sendMessage("Press jump again to start the countdown.")
                rocket.setDynamicProperty('ready', true)
            }
        }
        //set the camera and the player in the rocket      
        if (!rider.getDynamicProperty('in_the_rocket')) {
            rider.camera.setCamera("minecraft:follow_orbit", { radius: 20 })
            rider.setDynamicProperty('in_the_rocket', rocket.id)
            //display the countdown timer
            if (!active) rider.onScreenDisplay.setTitle('§c20', {fadeInDuration: 0, fadeOutDuration: 0, stayDuration: 20000})
        }
        //fix the camera and remove the countdown if the player leaves 
        system.runTimeout(() => {
            if (!rocket || !rocket.isValid) return
            const ride_id = rider.getComponent('minecraft:riding')?.entityRidingOn?.id
            if (ride_id != rocket.id) {
                rocket.setDynamicProperty('ready')
                dismount(rider)
            } 
        }, 20)
    }
}