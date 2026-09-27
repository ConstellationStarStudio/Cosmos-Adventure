import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { load_dynamic_object, save_dynamic_object, closeContainerUI } from "../../../api/utils";

function findInteractingPlayer(entity) {
    const loc = entity.location;
    return entity.dimension.getPlayers({
        location: { x: loc.x, y: loc.y, z: loc.z },
        maxDistance: 6,
    })[0];
}

function showPlayerNameForm(player, entity, currentName) {
    let attempts = 0;
    const tryShow = () => {
        if (attempts++ > 12 || !player.isValid) return;
        const form = new ModalFormData()
            .title("Player to open for")
            .textField("Enter player name:", "Player Name", { defaultValue: currentName || "" });

        form.show(player).then(response => {
            if (response.canceled && response.cancelationReason === "UserBusy") {
                mc.system.runTimeout(tryShow, 5);
                return;
            }
            if (response.canceled) return;
            const name = response.formValues[0];
            if (name != null) {
                entity.setDynamicProperty("airlock_player_name", name);
            }
        });
    };
    tryShow();
}

const data = {
    ui: "§a§i§r§l§o§c§k§_§c§o§n§t§r§o§l§l§e§r",
    onPlace(entity, block, event) {
        let ownerName = "";
        if (event && event.player) {
            ownerName = event.player.name;
        }
        
        save_dynamic_object(entity, {
            ownerName: ownerName,
            redstoneActivation: false,
            playerDistanceActivation: true,
            playerDistanceSelection: 0,
            playerNameMatches: false,
            playerToOpenFor: "",
            invertSelection: false,
            horizontalModeEnabled: false,
        }, "machine_data");
    },
    onTick(entity, block) {
        const vars = load_dynamic_object(entity, "machine_data");
        let redstoneActivation = vars.redstoneActivation ?? false;
        let playerDistanceActivation = vars.playerDistanceActivation ?? true;
        let playerDistanceSelection = vars.playerDistanceSelection ?? 0;
        if (playerDistanceSelection < 0 || playerDistanceSelection >= 4 || isNaN(playerDistanceSelection)) {
            playerDistanceSelection = 0;
        }
        let playerNameMatches = vars.playerNameMatches ?? false;
        let playerToOpenFor = vars.playerToOpenFor ?? "";
        let invertSelection = vars.invertSelection ?? false;
        let horizontalModeEnabled = vars.horizontalModeEnabled ?? false;
        let ownerName = vars.ownerName ?? "";
        if (!ownerName) {
            const p = findInteractingPlayer(entity);
            if (p) ownerName = p.name;
        }
        
        const container = entity.getComponent('minecraft:inventory').container;

        // get player name
        const newPlayerName = entity.getDynamicProperty("airlock_player_name");
        if (newPlayerName != null) {
            playerToOpenFor = newPlayerName;
            entity.setDynamicProperty("airlock_player_name", undefined);
            // overwrite slot 4
            const item = new mc.ItemStack('cosmos:ui_button');
            item.nameTag = playerToOpenFor || "§7(click to set)";
            container.setItem(4, item);
        }

        // skip click detection on first tick (slots are empty)
        if (!entity.getDynamicProperty("ui_initialized")) {
            entity.setDynamicProperty("ui_initialized", true);
        } else {

        // slot 0: redstone signal
        if (container.was_ui_clicked(0, entity)) { redstoneActivation = !redstoneActivation; }
        // slot 1: player within
        if (container.was_ui_clicked(1, entity)) { playerDistanceActivation = !playerDistanceActivation; }
        // slot 2: distance
        if (container.was_ui_clicked(2, entity)) { playerDistanceSelection = (playerDistanceSelection + 1) % 4; }
        // slot 3: player name matches
        if (container.was_ui_clicked(3, entity)) { playerNameMatches = !playerNameMatches; }
        // slot 4: player name
        if (container.was_ui_clicked(4, entity)) {
            const player = findInteractingPlayer(entity);
            if (player) {
                closeContainerUI(player);
                mc.system.run(() => {
                    showPlayerNameForm(player, entity, playerToOpenFor);
                });
            }
        }
        // slot 5: invert selection
        if (container.was_ui_clicked(5, entity)) { invertSelection = !invertSelection; }
        // slot 6: horizontal mode
        if (container.was_ui_clicked(6, entity)) { horizontalModeEnabled = !horizontalModeEnabled; }
        } // end ui_initialized

        save_dynamic_object(entity, {
            ownerName: ownerName,
            redstoneActivation: redstoneActivation,
            playerDistanceActivation: playerDistanceActivation,
            playerDistanceSelection: playerDistanceSelection,
            playerNameMatches: playerNameMatches,
            playerToOpenFor: playerToOpenFor,
            invertSelection: invertSelection,
            horizontalModeEnabled: horizontalModeEnabled,
        }, "machine_data");

        // activation logic
        let active = false;

        if (redstoneActivation) {
            const redstonePower = block.getRedstonePower ? block.getRedstonePower() : 0;
            active = redstonePower > 0;
        }

        if ((active || !redstoneActivation) && playerDistanceActivation) {
            const distances = [1, 2, 5, 10];
            const dist = distances[playerDistanceSelection] ?? 1;
            const center = { x: block.location.x + 0.5, y: block.location.y + 0.5, z: block.location.z + 0.5 };
            const players = entity.dimension.getPlayers({ location: center, maxDistance: dist });

            if (playerNameMatches) {
                let foundPlayer = false;
                for (const p of players) {
                    if (p.name.toLowerCase() === playerToOpenFor.toLowerCase()) {
                        foundPlayer = true;
                        break;
                    }
                }
                active = foundPlayer;
            } else {
                active = players.length > 0;
            }
        }

        if (!invertSelection) {
            active = !active;
        }

        // trace airlock frame
        const bounds = traceAirlock(block, horizontalModeEnabled);
        
        // update blocks
        if (bounds) {
            fillAirlock(entity.dimension, bounds, active);
        }
        
        // redraw ui
        const distLabels = ["1 Meter", "2 Meter", "5 Meter", "10 Meter"];

        container.add_ui_display(0, "Redstone Signal", redstoneActivation ? 1 : 0);
        container.add_ui_display(1, "Player Within: ", playerDistanceActivation ? 1 : 0);
        
        if (entity.getDynamicProperty("last_dist") !== playerDistanceSelection || !container.getItem(2)) {
            entity.setDynamicProperty("last_dist", playerDistanceSelection);
            container.setItem(2, undefined);
            container.add_ui_button(2, "§r" + (distLabels[playerDistanceSelection] || "1 Meter"));
        }
        
        container.add_ui_display(3, "Player Name is: ", playerNameMatches ? 1 : 0);
        container.add_ui_button(4, playerToOpenFor || "§7(click to set)");
        container.add_ui_display(5, "Invert Selection", invertSelection ? 1 : 0);
        container.add_ui_display(6, "Horizontal Mode", horizontalModeEnabled ? 1 : 0);
        container.add_ui_display(7, (playerToOpenFor || ownerName || "Airlock") + "'s Air Lock Controller", 0);
        container.add_ui_display(8, active ? "§cAir Lock Closed" : "§aAir Lock Open", 0);
    }
};

function traceAirlock(startBlock, horizontalModeEnabled) {
    const visited = new Set();
    const queue = [startBlock];
    
    let minX = startBlock.location.x;
    let maxX = startBlock.location.x;
    let minY = startBlock.location.y;
    let maxY = startBlock.location.y;
    let minZ = startBlock.location.z;
    let maxZ = startBlock.location.z;
    
    visited.add(`${startBlock.location.x},${startBlock.location.y},${startBlock.location.z}`);
    
    while (queue.length > 0) {
        const current = queue.shift();
        const { x, y, z } = current.location;
        
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
        
        if (maxX - minX > 20 || maxY - minY > 20 || maxZ - minZ > 20) {
            return null;
        }
        
        const directions = horizontalModeEnabled
            ? [[-1,0,0],[1,0,0],[0,0,-1],[0,0,1]]
            : [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
        
        for (const [dx, dy, dz] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            const nz = z + dz;
            const key = `${nx},${ny},${nz}`;
            
            if (visited.has(key)) continue;
            
            try {
                const block = startBlock.dimension.getBlock({x: nx, y: ny, z: nz});
                if (block && (block.typeId === "cosmos:airlock_frame" || block.typeId === "cosmos:airlock_controller")) {
                    visited.add(key);
                    queue.push(block);
                }
            } catch (e) {}
        }
    }
    
    if (visited.size < 5) return null;
    
    return { minX, maxX, minY, maxY, minZ, maxZ, dimension: startBlock.dimension };
}

function fillAirlock(dimension, bounds, active) {
    const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
    
    for (let x = minX + 1; x < maxX; x++) {
        for (let y = minY + 1; y < maxY; y++) {
            for (let z = minZ + 1; z < maxZ; z++) {
                try {
                    const block = dimension.getBlock({x, y, z});
                    if (block) {
                        if (active) {
                            if (block.typeId === "minecraft:air" || block.typeId === "cosmos:airlock_seal") {
                                if (block.typeId !== "cosmos:airlock_seal") {
                                    block.setType("cosmos:airlock_seal");
                                }
                            }
                        } else {
                            if (block.typeId === "cosmos:airlock_seal") {
                                block.setType("minecraft:air");
                            }
                        }
                    }
                } catch (e) {}
            }
        }
    }
}

export default data;
