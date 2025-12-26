import { system } from "@minecraft/server"
import { dismount, set_items_to_lander, saved_rocket_items, rocket_nametags} from "../../../api/player/liftoff";
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

function lander_rotation(player, lander){
    let final_rotation_x = lander.getProperty("cosmos:rotation_x");
    let final_rotation_y = lander.getProperty("cosmos:rotation_y");
    
    let input = player.inputInfo.getMovementVector();
    input = {x: Math.round(input.x), y: Math.round(input.y)}
    final_rotation_x = Math.min(Math.max(final_rotation_x + (input.y * 2), -45), 45);
    final_rotation_y = final_rotation_y + (input.x * 2);

    final_rotation_y = (final_rotation_y > 360)? 2:
    (final_rotation_y < 0)? 358:
    final_rotation_y;
    return [final_rotation_x, final_rotation_y]
}
export function moon_lander(player, load = true){
    let speed = 0;
    player.inputPermissions.setPermissionCategory(2, false);
    player.inputPermissions.setPermissionCategory(6, false);
    player.setProperty("cosmos:rotation_x", 90);
    
    let data = JSON.parse(player.getDynamicProperty('dimension'))
    let items_to_set = saved_rocket_items.get(data.id);
    saved_rocket_items.delete(data.id)
    let typeId = data.typeId;
    let size = data.size - 2;
    let group = 'cosmos:inv' + size;
    let lander = player.dimension.spawnEntity("cosmos:lander", {x: data.loc.x, y: 250, z: data.loc.z});
    lander.triggerEvent("cosmos:lander_gravity_disable");
    lander.teleport(data.loc);
    save_dynamic_object(lander, data.fuel, "vehicle_data")
    lander.getComponent("minecraft:rideable").addRider(player);
    player.camera.setCamera("minecraft:follow_orbit", { radius: 20 });
    player.setDynamicProperty("dimension", undefined);
    player.removeTag("ableToOxygen")

    let is_load = load;
    let camera = player.getRotation();
    let lander_flight = system.runInterval(() => {
        if(is_load){
            let new_camera = player.getRotation();
            if(new_camera.x != camera.x || new_camera.y != camera.y) is_load = false
            lander.triggerEvent(group);
            lander.nameTag = '§f§u§e§l§_§c§h§e§s§t§' + rocket_nametags[size]
            return;
        }
        if(!player || !player.isValid){
            system.clearRun(lander_flight);
            return;
        }
        if(!lander || !lander.isValid){
            dismount(player);
            system.clearRun(lander_flight);
            return;
        }
        if(player.inputInfo.getButtonState("Jump") == "Pressed"){
            speed = Math.min(speed + 0.03, lander.location.y < 115 ? -0.15 : -1.0);
        }else{
            speed = Math.min(speed - 0.022, -1.0);
        }
        speed -= 0.008;

        let translatedSpeed = {"rawtext": [
            {"translate": "gui.lander.velocity"},
            {"text": ": "},
            {"text": `${(Math.round(speed * 1000)/100)}`},
            {"text": " "},
            {"translate": "gui.lander.velocityu"}
        ]}
        player.onScreenDisplay.setTitle(" ", {fadeInDuration: 0, fadeOutDuration: 0, stayDuration: 2, subtitle: translatedSpeed})

        let rotation = lander_rotation(player, lander)
        lander.setProperty("cosmos:rotation_x", rotation[0])
        lander.setProperty("cosmos:rotation_y", rotation[1])

        let motY = Math.sin(rotation[0]/57.2957795147);
        let motX = Math.cos(rotation[1]/57.2957795147) * motY;
        let motZ = Math.sin(rotation[1]/57.2957795147) * motY;
        let speedX = motX / 2.0;
        let speedZ = motZ / 2.0;

        lander.clearVelocity();
        lander.applyImpulse({x: speedX, y: speed, z: speedZ})
        if(lander.location.y < 500 && lander.getVelocity().y === 0){
            if(Math.abs(speed) > 2){
                player.addTag("ableToOxygen");
                player.addTag("in_space");
                dismount(player);

                lander.setProperty("cosmos:rotation_x", 0)

                lander.dimension.createExplosion(lander.location, 10, {causesFire: false, breaksBlocks: true});
                lander.remove();
                system.clearRun(lander_flight);
            }else{
                lander.setProperty("cosmos:rotation_x", 0)
                player.inputPermissions.setPermissionCategory(2, true);
                player.addTag("ableToOxygen");
                player.addTag("in_space");
                dismount(player);
                lander.getComponent("minecraft:rideable").ejectRider(player)
                lander.triggerEvent("cosmos:rideable_false")

                set_items_to_lander(lander, size, items_to_set, typeId)

                lander.triggerEvent("cosmos:lander_gravity_enable")
                system.clearRun(lander_flight);
            }
        }
    });
}