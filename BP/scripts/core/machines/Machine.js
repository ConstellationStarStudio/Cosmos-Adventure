import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";
import machines from "./AllMachineBlocks";
import { detach_wires, attach_to_wires } from "../blocks/aluminum_wire";
import { pickaxes } from "../../api/utils";
import { setSolarPanelBlocks } from "./blocks/BasicSolarPanel";

const multi_block_machines = {
    "cosmos:basic_solar_panel": setSolarPanelBlocks
}

// Global UI Protection Lists
const PROTECTED_ITEMS = new Set(["cosmos:ui", "cosmos:ui_button"]);

class MachineManager {
    constructor() {
        this.machines = new Map(); // Map<entityId, MachineInstance>
        this.activeMachineList = []; // Array for round-robin ticking
        this.viewedMachines = new Set(); // Set<entityId>
        this.lastProcessedIndex = 0;
        
        this.init();
    }

    init() {
        // Lifecycle Events
        world.afterEvents.worldLoad.subscribe(() => this.onWorldLoad());
        world.afterEvents.entityLoad.subscribe((e) => this.register(e.entity));
        
        // Block Events
        system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
            blockComponentRegistry.registerCustomComponent('cosmos:machine', {
                beforeOnPlayerPlace: (e) => this.onPlace(e),
                onPlayerBreak: (e) => this.onBreak(e)
            });
        });

        // Interaction Events
        world.beforeEvents.playerInteractWithEntity.subscribe((e) => this.onInteract(e));
        
        // Global UI Protection (Drops)
        world.afterEvents.entitySpawn.subscribe((e) => {
            if (e.entity.typeId === "minecraft:item") {
                const item = e.entity.getComponent("item")?.itemStack;
                if (item && PROTECTED_ITEMS.has(item.typeId)) {
                    e.entity.remove();
                }
            }
        });

        // Main Tick Loop
        system.runInterval(() => this.tick(), 1);
    }

    onWorldLoad() {
        world.getDims(dimension => dimension.getEntities({ includeFamilies: ['machine'] })).forEach(entity => {
            this.register(entity);
        });
    }

    register(entity) {
        if (!entity.isValid) return;
        if (this.machines.has(entity.id)) return;

        const machineName = entity.typeId.replace('cosmos:', '');
        const config = machines[machineName];
        
        if (!config) return;

        const block = entity.dimension.getBlock(entity.location);
        // Create Persistent Instance
        let instance;
        const dynamic_object = JSON.parse(entity.getDynamicProperty("machine_data") ?? "{}");
        try {
            instance = new config.class(entity, block);
            
            // Inject metadata
            instance.machineName = machineName;
            instance.config = config;
            instance.lastTickTime = system.currentTick;
        } catch (e) {
            console.warn(`Failed to initialize machine ${machineName}: ${e}`);
            return;
        }

        const record = {
            id: entity.id,
            entity: entity,
            block: block,
            instance: instance,
            config: config,
            lastTickTime: system.currentTick,
            entity_data: dynamic_object
        };

        this.machines.set(entity.id, record);
        this.activeMachineList.push(record);
    }

    unregister(entityId) {
        const record = this.machines.get(entityId);
        if (record) {
            if (record.instance.onDestroy) record.instance.onDestroy();
            this.machines.delete(entityId);
            const idx = this.activeMachineList.indexOf(record);
            if (idx > -1) this.activeMachineList.splice(idx, 1);
            this.viewedMachines.delete(entityId);
        }
    }

    onPlace(event) {
        const { block, permutationToPlace: perm } = event;
        const machine_name = perm.type.id.replace('cosmos:', '');
        const machine_object = machines[machine_name];

        if (machine_object.multi_block && !multi_block_machines[perm.type.id](block)) {
            event.cancel = true;
            return;
        }

        system.run(() => {
            const machineEntity = block.dimension.spawnEntity(perm.type.id, block.bottomCenter());
            machineEntity.nameTag = machine_object.ui;
            
            this.register(machineEntity);
            const record = this.machines.get(machineEntity.id);
            if (record && record.instance.onPlace) {
                record.instance.onPlace();
            }

            attach_to_wires(block);
        });
    }

    onBreak({ block, dimension, brokenBlockPermutation: perm }) {
        detach_wires(block);
        const machineEntity = dimension.getEntities({
            type: perm.type.id,
            location: {
                x: Math.floor(block.location.x) + 0.5,
                y: Math.floor(block.location.y) + 0.5,
                z: Math.floor(block.location.z) + 0.5,
            },
            maxDistance: 0.5,
        })[0];

        if (!machineEntity) return;

        const machine_name = machineEntity.typeId.replace('cosmos:', '');
        if (machines[machine_name].multi_block) multi_block_machines[machineEntity.typeId](block, true);

        // Cleanup UI Items
        const container = machineEntity.getComponent('minecraft:inventory')?.container;
        if (container) {
            for (let i = 0; i < container.size; i++) {
                const item = container.getItem(i);
                if (item && PROTECTED_ITEMS.has(item.typeId)) {
                    container.setItem(i, undefined);
                }
            }
        }

        this.unregister(machineEntity.id);
        machineEntity.remove();
    }

    onInteract(e) {
        const { target: entity, player } = e;
        if (!this.machines.has(entity.id)) return;
        
        if (player.isSneaking) {
            e.cancel = true;
            this.handleSneakInteract(player, entity);
        }
    }

    handleSneakInteract(player, entity) {
        const equipment = player.getComponent("equippable");
        const selectedItem = equipment.getEquipment("Mainhand");
        if (!selectedItem) return;

        if (selectedItem.typeId === "minecraft:hopper") {
            const machineBlock = player.dimension.getBlock(entity.location);
            if (machineBlock) {
                const facingDirection = (() => {
                    const dx = player.location.x - entity.location.x;
                    const dz = player.location.z - entity.location.z;
                    if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 1 : 3;
                    else return dz > 0 ? 2 : 0;
                })();
                
                const getAdjacentBlockLocation = (location, facingDirection) => {
                     const dirs = [
                         { x: 0, y: 0, z: -1 }, // 0: North
                         { x: 1, y: 0, z: 0 },  // 1: East
                         { x: 0, y: 0, z: 1 },  // 2: South
                         { x: -1, y: 0, z: 0 }  // 3: West
                     ];
                     const d = dirs[facingDirection];
                     return { x: location.x + d.x, y: location.y + d.y, z: location.z + d.z };
                };

                const hopperLocation = getAdjacentBlockLocation(machineBlock.location, facingDirection);
                const hopperBlock = player.dimension.getBlock(hopperLocation);
                const hasEntities = player.dimension.getEntities({ location: {x: hopperLocation.x+0.5, y: hopperLocation.y+0.5, z:hopperLocation.z+0.5}, maxDistance: 0.5}).length > 0;
                
                if (hopperBlock.typeId === "minecraft:air" && !hasEntities) {
                     const hopperPerm = BlockPermutation.resolve("minecraft:hopper").withState("facing_direction", facingDirection);
                     system.run(() => {
                         hopperBlock.setPermutation(hopperPerm);
                         if (player.getGameMode() !== "Creative") {
                             if (selectedItem.amount === 1) equipment.setEquipment("Mainhand", undefined);
                             else { selectedItem.amount--; equipment.setEquipment("Mainhand", selectedItem); }
                         }
                     });
                }
            }
        }
    }

    tick() {
        try {
            const currentTick = system.currentTick;
            this.updateViewedMachines(currentTick);

            // Tick Viewed Machines (Priority: Every Tick)
            for (const entityId of this.viewedMachines) {
                this.tickMachine(entityId, currentTick, true);
            }

            // Tick Background Machines (Delta Time-based Round Robin)
            const TIME_BUDGET_MS = 2;
            const startTime = Date.now();
            const totalAtStart = this.activeMachineList.length;

            if (totalAtStart > 0) {
                // Iterate up to the number of machines we had at the start
                for (let i = 0; i < totalAtStart; i++) {
                    // Optimization: Check time budget every 5 iterations to reduce Date.now() overhead
                    if (i % 5 === 0 && Date.now() - startTime >= TIME_BUDGET_MS) break;
                    
                    // Safety: Check current length in case machines were unregistered during this loop
                    const currentTotal = this.activeMachineList.length;
                    if (currentTotal === 0) break;
                    
                    this.lastProcessedIndex = (this.lastProcessedIndex + 1) % currentTotal;
                    const record = this.activeMachineList[this.lastProcessedIndex];
                    
                    if (record && !this.viewedMachines.has(record.id)) {
                        this.tickMachine(record.id, currentTick, false);
                    }
                }
            }
        } catch (e) {
        //This is where out of bounds happens sometimes
        }
    }

    updateViewedMachines(currentTick) {
        if (currentTick % 5 !== 0) return;
        this.viewedMachines.clear();
        for (const player of world.getAllPlayers()) {
            this.protectPlayerInventory(player);
            const entityHit = player.getEntitiesFromViewDirection({
                maxDistance: 6,
                families: ["cosmos"],
                ignoreBlockCollision: true
            })[0];

            if (entityHit && this.machines.has(entityHit.entity.id)) {
                this.viewedMachines.add(entityHit.entity.id);
                const machineEntity = entityHit.entity;
                if (player.isSneaking) {
                    machineEntity.triggerEvent("cosmos:shrink");
                } else {
                    const item = player.getComponent("minecraft:equippable").getEquipment("Mainhand")?.typeId;
                    if (pickaxes.has(item) || item === "cosmos:standard_wrench") {
                         machineEntity.triggerEvent("cosmos:shrink");
                    }
                }
            }
        }
    }

    protectPlayerInventory(player) {
        const cursor = player.getComponent("cursor_inventory");
        if (cursor && cursor.item && PROTECTED_ITEMS.has(cursor.item.typeId)) cursor.clear();

        const inventory = player.getComponent("inventory")?.container;
        if (inventory) {
            for (let i = 0; i < inventory.size; i++) {
                const item = inventory.getItem(i);
                if (item && PROTECTED_ITEMS.has(item.typeId)) inventory.setItem(i, undefined);
            }
        }
    }

    tickMachine(entityId, currentTick, isViewed) {
        const record = this.machines.get(entityId);
        if (!record || !record.entity.isValid) {
            if (record) this.unregister(entityId);
            return;
        }

        const dt = currentTick - record.lastTickTime;
        if (dt <= 0) return;

        try {
            if (!record.block || !record.block.isValid) {
                record.block = record.entity.dimension.getBlock(record.entity.location);
            }
            if (record.block.typeId !== record.entity.typeId) return;
        } catch (e) { return; }

        try {
            if (typeof record.instance.tick === 'function') record.instance.tick(dt);
            else new record.config.class(record.entity, record.block);

            if (currentTick % 8 === 0) this.handleHopperInteractions(record.block, record.entity, record.config);
        } catch (e) {
            console.warn(`Error ticking machine ${record.id}: ${e}`);
        }
        record.lastTickTime = currentTick;
    }

    handleHopperInteractions(block, entity, data) {
        if (!data.items) return;

        // Output 
        if (data.items.output) {
             const hopper = block.below();
             if (hopper && hopper.typeId === "minecraft:hopper" && !hopper.permutation.getState("toggle_bit")) {
                 const machInv = entity.getComponent("inventory").container;
                 const hopInv = hopper.getComponent("inventory").container;
                 
                 for (const slot of data.items.output) {
                     const item = machInv.getItem(slot);
                     if (item) {
                         const move = item.clone(); move.amount = 1;
                         const left = hopInv.addItem(move);
                         if (!left) {
                             if (item.amount > 1) { item.amount--; machInv.setItem(slot, item); }
                             else machInv.setItem(slot, undefined);
                             break; 
                         }
                     }
                 }
             }
        }

        // Input
        if (data.items.top_input) {
            const hopper = block.above();
            if (hopper && hopper.typeId === "minecraft:hopper" && !hopper.permutation.getState("toggle_bit") && hopper.permutation.getState("facing_direction") === 0) {
                 this.pullFromHopper(hopper, entity, data.items.top_input);
            }
        }

        // Input
        if (data.items.side_input) {
             const dirs = { north: 3, east: 4, south: 2, west: 5 };
             for (const [dir, face] of Object.entries(dirs)) {
                 const hopper = block[dir]();
                 if (hopper && hopper.typeId === "minecraft:hopper" && !hopper.permutation.getState("toggle_bit") && hopper.permutation.getState("facing_direction") === face) {
                      this.pullFromHopper(hopper, entity, data.items.side_input);
                 }
             }
        }
    }

    pullFromHopper(hopper, entity, targetSlots) {
        const hopInv = hopper.getComponent("inventory").container;
        const machInv = entity.getComponent("inventory").container;
        let hopSlot = -1;
        let itemToMove = null;
        for (let i = 0; i < hopInv.size; i++) {
            const item = hopInv.getItem(i);
            if (item) { hopSlot = i; itemToMove = item; break; }
        }
        if (!itemToMove) return;
        for (const slot of targetSlots) {
             const current = machInv.getItem(slot);
             if (!current) {
                 const newItem = itemToMove.clone(); newItem.amount = 1;
                 machInv.setItem(slot, newItem);
                 if (itemToMove.amount > 1) { itemToMove.amount--; hopInv.setItem(hopSlot, itemToMove); }
                 else hopInv.setItem(hopSlot, undefined);
                 return;
             } else if (current.isStackableWith(itemToMove) && current.amount < current.maxAmount) {
                 current.amount++;
                 machInv.setItem(slot, current);
                 if (itemToMove.amount > 1) { itemToMove.amount--; hopInv.setItem(hopSlot, itemToMove); }
                 else hopInv.setItem(hopSlot, undefined);
                 return;
             }
        }
    }
}

export const machineManager = new MachineManager();
export const machine_entities = machineManager.machines;
export function get_data(entity) {
    return machines[entity.typeId.replace('cosmos:', '')];
}
