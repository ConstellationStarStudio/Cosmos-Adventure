/**
 * @fileoverview Machine Engine — Lazy Evaluation Tick System
 *
 * This is the central tick orchestrator for ALL machines in Cosmos-Adventure.
 * It manages machine entity lifecycles, ticking, hopper I/O, and the lazy
 * evaluation optimization system.
 *
 * ## Architecture Overview
 *
 * Every machine block (compressor, furnace, refinery, etc.) has a companion
 * entity spawned at its block center. The entity holds the machine's inventory
 * (container) and persistent state (dynamic properties). This file maintains
 * a runtime registry (`machine_entities` Map) of all active machines and runs
 * a single `system.runInterval` that iterates them each tick.
 *
 * ## Lazy Evaluation (Demand-Driven Ticking)
 *
 * **Problem:** With 50+ machines placed, calling `onTick()` on every single
 * machine every tick is extremely expensive — most machines sit idle with
 * nobody looking at them.
 *
 * **Solution:** Machines are split into two categories:
 *
 * 1. **Dormant machines** — No player has the container UI open.
 *    These are SKIPPED entirely in the tick loop. A `sleepTick` timestamp
 *    records when they went dormant. This timestamp is persisted to the
 *    entity's dynamic properties so it survives chunk unload/reload.
 *
 * 2. **Awake machines** — A player has the container open (`active_ui > 0`),
 *    OR the machine is in the `ALWAYS_TICK` set. These tick normally.
 *
 * **Catch-up:** When a player opens a dormant machine's container:
 *   - The system calculates `elapsed = currentTick - sleepTick`
 *   - It replays the machine's `onTick()` for those elapsed ticks
 *   - Replay is spread across frames via `system.runInterval` to prevent lag
 *   - Hopper interactions are also replayed (every 8th catch-up tick)
 *   - Neighboring dormant machines within 2 blocks are also caught up
 *     to ensure hopper chains (Machine A → hopper → Machine B) stay consistent
 *
 * **Always-awake exceptions:** Some machines interact with the live world
 * (placing blocks, teleporting entities, rotating models) and must always tick:
 *   - `airlock_controller` — real-time block placement/removal
 *   - `short_range_telepad` — real-time entity teleportation
 *   - `terraformer` — real-time world block modification
 *   - `oxygen_distributor` — live bubble radius visual
 *   - `basic_solar_panel` / `advanced_solar_panel` — live panel rotation
 *
 * ## Fluid & Energy Handling
 *
 * All fluid pipe interactions (`output_fluid`, `load_from_pipe`, `load_from_item`)
 * and energy wire interactions (`charge_from_wires`, `charge_battery`) are called
 * from INSIDE each machine's `onTick()` method. This means they are automatically
 * replayed during catch-up — no special handling needed.
 *
 * **Important caveat:** Pipe/wire transfers to ADJACENT machines during catch-up
 * are handled by `wake_neighbors()` which wakes dormant machines within 2 blocks.
 * However, very long pipe networks (>2 blocks) may not fully propagate during
 * a single catch-up since only direct neighbors are awakened.
 *
 * @module Machine
 */

import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";
import machines from "./AllMachineBlocks";
import { multi_blocks } from "../mullti_blocks/MultiBlock";
import { detach_wires, attach_to_wires } from "../blocks/aluminum_wire";
import { attach_pipes, detach_pipes } from "../blocks/fluid_pipe";
import { pickaxes } from "../../api/utils";
import { setSolarPanelBlocks } from "./blocks/SolarPanel"; 
import data from "./blocks/CoalGenerator";

/**
 * Registry of multi-block machine placement validators.
 * Maps block type IDs to functions that validate/set up the multi-block structure.
 * @type {Object<string, function(Block, boolean=): boolean>}
 */
const multi_block_machines = {
	"cosmos:basic_solar_panel": setSolarPanelBlocks,
	"cosmos:advanced_solar_panel": setSolarPanelBlocks
}

/**
 * Runtime registry of all active machine entities.
 * Key: entity ID string, Value: MachineData object.
 *
 * @type {Map<string, MachineData>}
 *
 * @typedef {Object} MachineData
 * @property {string} type - Machine identifier without namespace (e.g. "compressor", "electric_furnace")
 * @property {{x: number, y: number, z: number}} location - Floored block location of the machine
 * @property {Object} entity_data - Cached parsed dynamic property data (from "machine_data")
 * @property {number} [sleepTick] - Tick when this machine went dormant (undefined = awake).
 *   Persisted to entity dynamic property "sleep_tick" to survive chunk unload/reload.
 */
export let machine_entities = new Map();

/**
 * Returns the machine definition object for a given machine entity.
 * @param {Entity} entity - The machine entity
 * @returns {Object|undefined} Machine definition from AllMachineBlocks, or undefined
 */
export function get_data(entity) {
	return machines[entity.typeId.replace('cosmos:', '')]
}

/**
 * Registers a machine entity into the runtime registry when it loads or spawns.
 * Validates that the entity's block still exists and matches its type.
 * Restores `sleepTick` from the entity's persisted dynamic property if present
 * (this is how sleep state survives chunk unload/reload cycles).
 *
 * @param {Entity} entity - The machine entity to register
 */
function reload_machine(entity){
	const machine_name = entity.typeId.replace('cosmos:', '');
	if (!Object.keys(machines).includes(machine_name)) return;
	if (machine_entities.has(entity.id)) return;
	const block = entity.dimension.getBlock(entity.location);
	if (block && block.typeId != entity.typeId) {
		machine_entities.delete(entity.id);
		entity.remove();
		return;
	}
	let block_location = (block)? block.location: entity.location;
	block_location = {x: Math.floor(block_location.x), y: Math.floor(block_location.y), z: Math.floor(block_location.z)};

	const dynamic_object = JSON.parse(entity.getDynamicProperty("machine_data") ?? "{}");
	// Restore sleepTick from persisted dynamic property (survives chunk unload)
	const persisted_sleep = entity.getDynamicProperty("sleep_tick");
	const entry = { type: machine_name, location: block_location, entity_data: dynamic_object };
	if (persisted_sleep !== undefined) entry.sleepTick = persisted_sleep;
	machine_entities.set(entity.id, entry);
}

/**
 * Handles hopper item transfer interactions for a machine block.
 * Processes three directions:
 * - **Below:** Drains items from machine output slots into hopper below
 * - **Above:** Pulls items from hopper above into machine top input slots
 * - **Sides:** Pulls items from side hoppers into machine side input slots
 *
 * Called every 8 ticks during normal operation and every 8th tick during catch-up.
 *
 * @param {Block} block - The machine's block reference
 * @param {Entity} entity - The machine entity (has inventory component)
 * @param {Object} data - Machine definition from AllMachineBlocks (has items.output, items.top_input, items.side_input)
 */
function hopper_interactions(block, entity, data) {
	;(()=>{ // drain items out of the output slots
		let hopper; try { hopper = block.below()} catch {} // makes sure it doesn't try pick a block below the world bottom 
		if (hopper?.typeId != "minecraft:hopper") return // it's a hopper
		if (hopper.permutation.getState("toggle_bit")) return // hopper isn't locked
		if (!data.items.output) return // the machine has outputs

		// get the outputs of the machine
		const machine_container = entity.getComponent("inventory").container
		const hopper_container = hopper.getComponent("inventory").container
		const outputs = data.items.output.map(i => ({slot: i, item: machine_container.getItem(i)}))

		// find the first output slot that isn't empty
		const first_output = outputs.find(output => output.item)
		if (!first_output) return
		
		// create the new item stacks for the machine and the hopper 
		const item_to_move = new ItemStack(first_output.item.typeId, 1)
		const moved_item = first_output.item.decrementStack()

		// update the items of the machine and the hopper
		const managed_to_move = !hopper_container.addItem(item_to_move) // container.addItem adds an item to the hopper if it has space for it or returns the item it tried to move
		if (managed_to_move) machine_container.setItem(first_output.slot, moved_item)	
	})()
	;(()=>{ // send items to the top of the machine
		let hopper; try { hopper = block.above()} catch {} // makes sure it doesn't try to get a block above the build limit
		if (hopper?.typeId != "minecraft:hopper") return // it's a hopper
		if (hopper.permutation.getState("toggle_bit")) return // not a locked hopper
		if (hopper.permutation.getState("facing_direction") != 0) return // hopper is pointing down down
		if (!data.items.top_input) return // the machine has inputs

		// get the first item in the hopper
		const hopper_container = hopper.getComponent("inventory").container
		const hopper_slot = hopper_container.firstItem()
		if (hopper_slot == undefined) return
		const item_to_move = hopper_container.getItem(hopper_slot)
		if (!item_to_move) return
		
		// get the inputs of the machine
		const machine_container = entity.getComponent("inventory").container
		const inputs = data.items.top_input.map(i => ({slot: i, item: machine_container.getItem(i)}))

		// check if the machine inputs have space
		let receiving_slot
		if (inputs.some(input => { // check if at least one slot passes and set it as the recievng slot
			if (!input.item) {receiving_slot = input.slot; return true} // pass if the slot is empty
			if (!input.item.isStackableWith(item_to_move)) return false // return if the items don't stack
			if (input.item.amount + 1 <= input.item.maxAmount) {receiving_slot = input.slot; return true} // pass if the item doesn't exceed the stack sise
		})) {
			// update the item of the hopper and mahcine
			hopper_container.setItem(hopper_slot, item_to_move.decrementStack())
			machine_container.setItem(receiving_slot, machine_container.getItem(receiving_slot)?.incrementStack() ?? new ItemStack(item_to_move.typeId))
		}
	})()
	const send_to_side = (direction) => { // send items to the side of the machine
		let hopper; try { hopper = block[direction]()} catch {} // makes sure it doesn't try to get a block from an unloaded chunk
		if (hopper?.typeId != "minecraft:hopper") return // it's a hopper
		if (hopper.permutation.getState("toggle_bit")) return // not a locked hopper
		if (hopper.permutation.getState("facing_direction") != {north: 3, east: 4, south: 2, west: 5}[direction]) return // hopper is pointing down down
		if (!data.items.side_input) return // the machine has side inputs
		
		// get the first item in the hopper
		const hopper_container = hopper.getComponent("inventory").container
		const hopper_slot = hopper_container.firstItem()
		if (hopper_slot == undefined) return
		const item_to_move = hopper_container.getItem(hopper_slot)
		if (!item_to_move) return
		
		// get the side inputs of the machine
		const machine_container = entity.getComponent("inventory").container
		const inputs = data.items.side_input.map(i => ({slot: i, item: machine_container.getItem(i)}))

		// check if the machine inputs have space
		let receiving_slot
		if (inputs.some(input => { // check if at least one slot passes and set it as the recievng slot
			if (!input.item) {receiving_slot = input.slot; return true} // pass if the slot is empty
			if (!input.item.isStackableWith(item_to_move)) return false // return if the items don't stack
			if (input.item.amount + 1 <= input.item.maxAmount) {receiving_slot = input.slot; return true} // pass if the item doesn't exceed the stack sise
		})) {
			// update the item of the hopper and mahcine
			hopper_container.setItem(hopper_slot, item_to_move.decrementStack())
			machine_container.setItem(receiving_slot, machine_container.getItem(receiving_slot)?.incrementStack() ?? new ItemStack(item_to_move.typeId))
		}
	}
	;["north", "east", "south", "west"].forEach(direction => send_to_side(direction))
}



/**
 * Runs raycasts from all players to detect machine entities they're looking at.
 * If a player is sneaking or holding a pickaxe/wrench and looking at a cosmos entity,
 * triggers the "cosmos:shrink" event on it (used for hit-box shrinking on interaction).
 * Called every 2 ticks from the main tick loop.
 */
function block_entity_access() {
	const players = world.getAllPlayers();
	for (const player of players) {
		if (!player || !player.isValid) continue;
		const item = player.getComponent("minecraft:equippable")?.getEquipment("Mainhand")?.typeId;
		const has_pickaxe = pickaxes.has(item);
		const has_wrench = item === "cosmos:standard_wrench" || item === "cosmos:wrench";
		if (!player.isSneaking && !has_pickaxe && !has_wrench) continue;

		const targetEntity = player.getEntitiesFromViewDirection({
			maxDistance: 6,
			families: ["cosmos"],
			ignoreBlockCollision: true
		})[0]?.entity;

		if (targetEntity) {
			targetEntity.triggerEvent("cosmos:shrink");
		}
	}
}

// ============================================================================
// LAZY EVALUATION SYSTEM
// ============================================================================

/**
 * Set of machine type identifiers that MUST always tick regardless of UI state.
 * These machines interact with the live world in ways that cannot be deferred:
 * - `airlock_controller` — places/removes airlock_seal blocks based on player proximity
 * - `short_range_telepad` — detects standing entities and teleports them in real-time
 * - `terraformer` — modifies world blocks (grass, water, saplings) in a radius
 * - `oxygen_distributor` — updates live bubble_radius entity property for render controller
 * - `basic_solar_panel` / `advanced_solar_panel` — smoothly rotates panel entity model
 *
 * @type {Set<string>}
 */
const ALWAYS_TICK = new Set([
	"airlock_controller",
	"short_range_telepad",
	"terraformer",
	"oxygen_distributor",
	"basic_solar_panel",
	"advanced_solar_panel",
]);

/**
 * Maximum number of ticks to catch up when a dormant machine wakes.
 * Prevents massive lag spikes if a machine has been dormant for hours.
 * 6000 ticks ≈ 5 minutes of real-time at 20 TPS.
 * @type {number}
 */
const MAX_CATCHUP_TICKS = 6000;

/**
 * Number of catch-up ticks to replay per frame.
 * Higher values = faster catch-up but more per-frame CPU usage.
 * 20 replayed ticks per frame means a 6000-tick catch-up takes 300 frames (15 seconds).
 * @type {number}
 */
const CATCHUP_PER_FRAME = 20;

/**
 * Starts a self-clearing `system.runInterval` that replays a dormant machine's
 * `onTick()` for the number of elapsed ticks since it went to sleep.
 *
 * Processes `CATCHUP_PER_FRAME` ticks each frame to spread the work and prevent
 * lag spikes. Also runs `hopper_interactions()` every 8th replayed tick to maintain
 * item flow through hopper chains during catch-up.
 *
 * **Critical: system.currentTick spoofing**
 * Many machine `onTick()` methods use `system.currentTick % N` for rate-limiting
 * (e.g. fluids.js uses `% 20`, Refinery uses `% 2`, OxygenCollector uses `% 10`).
 * During catch-up, all iterations run in the same real tick, so `system.currentTick`
 * would be constant — breaking ALL rate-limited operations. To fix this, we
 * temporarily override `system.currentTick` to simulate advancing time, incrementing
 * by 1 for each replayed tick. The real value is restored after each frame batch.
 *
 * The interval auto-cancels via `system.clearRun()` when:
 * - All elapsed ticks have been replayed
 * - The machine entity becomes invalid (broken/removed)
 *
 * **Fluid & energy note:** All fluid pipe interactions (`output_fluid`, `load_from_pipe`)
 * and wire energy transfers (`charge_from_wires`) are called from INSIDE each machine's
 * `onTick()`, so they are automatically replayed during catch-up with correct timing.
 *
 * @param {Entity} machineEntity - The machine entity to catch up
 * @param {Block} block - The machine's block reference
 * @param {Object} data - Machine definition from AllMachineBlocks (has onTick method)
 * @param {number} elapsedTicks - Number of ticks the machine was dormant
 * @param {number} sleepTick - The tick when the machine went dormant (used to reconstruct virtual tick values)
 */
function start_catchup(machineEntity, block, data, elapsedTicks, sleepTick) {
	const total = Math.min(elapsedTicks, MAX_CATCHUP_TICKS);
	let done = 0;
	const handle = system.runInterval(() => {
		if (!machineEntity.isValid) { system.clearRun(handle); return; }

		// Spoof system.currentTick so rate-limiting (% 2, % 8, % 10, % 20) works correctly
		const realTick = system.currentTick;
		for (let i = 0; i < CATCHUP_PER_FRAME && done < total; i++, done++) {
			system.currentTick = sleepTick + done;
			data.onTick(machineEntity, block);
			// Simulate hopper interactions at the same rate as live ticking (every 8 ticks)
			if (done % 8 === 0) hopper_interactions(block, machineEntity, data);
		}
		// Restore real tick value
		system.currentTick = realTick;

		if (done >= total) system.clearRun(handle);
	});
}

/**
 * When a machine wakes up, also catches up all dormant machines within 2 blocks.
 * This ensures hopper chains (Machine A → hopper → Machine B) produce consistent
 * results — the upstream machine's catch-up generates output items before the
 * downstream machine tries to consume them.
 *
 * Uses Chebyshev distance (max of |dx|, |dy|, |dz|) with threshold of 2 blocks,
 * which covers all possible hopper orientations (above, below, and 4 cardinal sides).
 *
 * **Limitation:** Only wakes DIRECT neighbors (2-block radius). Very long chains
 * (A → hopper → B → hopper → C) where A and C are >2 blocks apart will only
 * cascade if B is within 2 blocks of both A and C. In practice this covers
 * virtually all real setups since hoppers are 1 block long.
 *
 * @param {Entity} sourceEntity - The machine entity that just woke up
 * @param {MachineData} sourceMachineData - The waking machine's registry data (has .location)
 */
function wake_neighbors(sourceEntity, sourceMachineData) {
	const loc = sourceMachineData.location;
	machine_entities.forEach((neighborData, neighborId) => {
		if (neighborId === sourceEntity.id) return; // skip self
		if (!neighborData.sleepTick) return; // already awake
		if (ALWAYS_TICK.has(neighborData.type)) return; // always ticks anyway

		// Check if neighbor is within 2 blocks (hopper reach)
		const nl = neighborData.location;
		if (Math.abs(nl.x - loc.x) > 2 || Math.abs(nl.y - loc.y) > 2 || Math.abs(nl.z - loc.z) > 2) return;

		const neighborEntity = world.getEntity(neighborId);
		if (!neighborEntity?.isValid) return;

		const neighborSleepTick = neighborData.sleepTick;
		const elapsed = system.currentTick - neighborSleepTick;
		delete neighborData.sleepTick;
		// Clear persisted sleep on the entity
		try { neighborEntity.setDynamicProperty("sleep_tick", undefined); } catch (e) {}

		if (elapsed <= 0) return;

		const nData = machines[neighborData.type];
		if (!nData) return;

		let nBlock;
		try { nBlock = neighborEntity.dimension.getBlock(neighborData.location); } catch (e) {}
		if (!nBlock) return;

		start_catchup(neighborEntity, nBlock, nData, elapsed, neighborSleepTick);
	});
}

// ============================================================================
// MAIN TICK LOOP
// ============================================================================

/**
 * World load handler — initializes the machine registry and starts the main tick loop.
 *
 * On world load:
 * 1. Scans all dimensions for entities with the "machine" family and registers them
 * 2. Starts a `system.runInterval` (every tick) that:
 *    - Runs `block_entity_access()` every 2 ticks (player raycast for wrench/pickaxe)
 *    - Iterates all registered machines:
 *      - Removes invalid/mismatched entries
 *      - **Dormant machines** (no UI open, not in ALWAYS_TICK): records sleepTick, skips
 *      - **Awake machines**: calls `onTick()` and `hopper_interactions()` (every 8 ticks)
 */
world.afterEvents.worldLoad.subscribe(() => {
	world.getDims(dimension => dimension.getEntities({includeFamilies: ['machine']})).forEach(entity => {reload_machine(entity)});
	system.runInterval(() => {
		if (machine_entities.size === 0 && multi_blocks.size === 0) return;
		// give block access every 2 ticks
		if (!(system.currentTick % 2)) block_entity_access();

		const isHopperTick = (system.currentTick % 8 === 0);

		machine_entities.forEach((machineData, entityId) => {
			const machineEntity = world.getEntity(entityId);
			if (!machineEntity?.isValid) {
				machine_entities.delete(entityId);
				return;
			}
			const dimension = machineEntity.dimension;
			let block;
			try { block = dimension.getBlock(machineData.location); } catch (e) {}
			if (!block) return;

			if (block.typeId !== machineEntity.typeId) {
				machine_entities.delete(entityId);
				try { machineEntity.remove(); } catch (e) {}
				return;
			}

			const data = machines[machineData.type];
			if (!data) return;

			const isAwake = machineEntity.active_ui || ALWAYS_TICK.has(machineData.type);

			if (!isAwake) {
				// Machine is dormant — record when it fell asleep (if not already recorded)
				if (!machineData.sleepTick) {
					machineData.sleepTick = system.currentTick;
					// Persist to entity dynamic property so it survives chunk unload
					try { machineEntity.setDynamicProperty("sleep_tick", system.currentTick); } catch (e) {}
				}
				return; // skip ticking this machine entirely
			}

			// Machine is awake — tick it normally
			data.onTick(machineEntity, block);

			// hopper support every 8 ticks
			if (isHopperTick) hopper_interactions(block, machineEntity, data);
		});
	});
});

// ============================================================================
// BLOCK CUSTOM COMPONENT — PLACEMENT & BREAKING
// ============================================================================

/**
 * Custom block component handlers for machine blocks.
 * Registered in `system.beforeEvents.startup` via the block component registry.
 *
 * @property {Function} beforeOnPlayerPlace - Spawns the machine entity, sets nameTag,
 *   registers in machine_entities, and connects to wire/pipe networks.
 * @property {Function} onPlayerBreak - Disconnects wires/pipes, clears UI items from
 *   inventory, kills (drops items) and removes the machine entity.
 */
export const machine_component = {
	/**
	 * Called before a machine block is placed by a player.
	 * Spawns the companion entity at block center, assigns the UI nameTag,
	 * calls the machine's optional `onPlace` hook, and connects to adjacent
	 * wire and pipe networks.
	 * @param {Object} event - Block place event with block and permutationToPlace
	 */
	beforeOnPlayerPlace(event) {
		const { block, permutationToPlace: perm } = event;
		const machine_name = perm.type.id.replace('cosmos:', '');
		const machine_object = machines[machine_name];
		if (!machine_object) return;
		if(machine_object.multi_block && !multi_block_machines[perm.type.id](block)){event.cancel = true; return;}
		
		system.run(() => {
			const entity = block.dimension.spawnEntity(perm.type.id, block.bottomCenter());
			entity.nameTag = machine_object.ui;
			if (typeof machine_object.onPlace == 'function') machine_object.onPlace(entity, block, event)
			const dynamic_object = JSON.parse(entity.getDynamicProperty("machine_data") ?? "{}");
			machine_entities.set(entity.id, { type: machine_name, location: block.location, entity_data: dynamic_object });
			if (perm.getState("cosmos:full")) {
				event.permutationToPlace = perm.withState("cosmos:full", false);
			}
			attach_to_wires(block);
			attach_pipes(block)
		});
	},

	/**
	 * Called when a player breaks a machine block.
	 * Disconnects from wire/pipe networks, removes UI placeholder items from
	 * the entity's inventory (so they don't drop), then kills the entity
	 * (which drops real items) and removes it.
	 * @param {Object} param0 - Break event with block, dimension, and brokenBlockPermutation
	 */
	onPlayerBreak({ block, dimension, brokenBlockPermutation: perm }) {
		detach_wires(block);
		detach_pipes(block, perm, "machine");
		
		const entity = dimension.getEntities({
			type: perm.type.id,
			location: {
				x: Math.floor(block.location.x) + 0.5,
				y: Math.floor(block.location.y) + 0.5,
				z: Math.floor(block.location.z) + 0.5,
			},
			maxDistance: 0.5,
		})[0];
		if (!entity) return

		const machine_name = entity.typeId.replace('cosmos:', '');
		if(machines[machine_name].multi_block) multi_block_machines[entity.typeId](block, true);

		machine_entities.delete(entity.id);
		const container = entity.getComponent('minecraft:inventory')?.container;
		if (container) {
			for (let i = 0; i < container.size; i++) {
				const itemId = container.getItem(i)?.typeId;
				if (!['cosmos:ui', 'cosmos:ui_button'].includes(itemId)) continue;
				container.setItem(i);
			}
		}
		entity.kill(); // kill to make it drop the items
		entity.remove();
	},
}

// ============================================================================
// EVENT SUBSCRIPTIONS
// ============================================================================

/** Re-register machine entities when they load into a chunk */
world.afterEvents.entityLoad.subscribe(({ entity }) => reload_machine(entity));

/**
 * Handles sneaking player interaction with machine entities.
 * If the player is holding a hopper and sneaking, places a hopper block adjacent
 * to the machine in the direction the player is facing.
 */
world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
	const { target: entity, player } = e;
	if (!machine_entities.has(entity.id)) return;
	if (!player.isSneaking) return;

	e.cancel = true;
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
				switch (facingDirection) {
					case 0: return { x: location.x, y: location.y, z: location.z - 1 };
					case 1: return { x: location.x + 1, y: location.y, z: location.z };
					case 2: return { x: location.x, y: location.y, z: location.z + 1 };
					case 3: return { x: location.x - 1, y: location.y, z: location.z };
					default: return location;
				}
			};

			const hopperLocation = getAdjacentBlockLocation(machineBlock.location, facingDirection);
			const hopperBlock = player.dimension.getBlock(hopperLocation);

			const hasEntitiesAt = (dimension, location) => {
				const entities = dimension.getEntities({
					location: { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 },
					maxDistance: 0.5,
				});
				return entities.length > 0;
			};

			if (hopperBlock.typeId === "minecraft:air" && !hasEntitiesAt(player.dimension, hopperLocation)) {
				const hopperPermutation = BlockPermutation.resolve("minecraft:hopper")
					.withState("facing_direction", facingDirection);

				system.run(() => {
					hopperBlock.setPermutation(hopperPermutation);
					if (player.getGameMode() !== "Creative") {
						if (selectedItem.amount === 1) {
							equipment.setEquipment("Mainhand", undefined);
						} else {
							selectedItem.amount -= 1;
							equipment.setEquipment("Mainhand", selectedItem);
						}
					}
				});
			}
		}
	}
});

/** Removes dropped "cosmos:ui" item entities (UI placeholder items should never exist in the world) */
world.afterEvents.entitySpawn.subscribe((data) => {
	if (data.entity.isValid && data.entity.typeId == "minecraft:item" && data.entity.getComponent("minecraft:item")?.itemStack.typeId == "cosmos:ui") {
		data.entity.remove();
	}
});

// ============================================================================
// LAZY EVALUATION — CONTAINER OPEN / CLOSE HANDLERS
// ============================================================================

/**
 * Container Open handler — wakes dormant machines and triggers catch-up.
 *
 * When a player opens a machine's container:
 * 1. Increments `entity.active_ui` counter (tracks how many players have it open)
 * 2. If the machine was dormant (has `sleepTick`):
 *    a. Calculates elapsed ticks since it went to sleep
 *    b. Clears the persisted `sleep_tick` dynamic property
 *    c. Wakes all neighboring dormant machines within 2 blocks (hopper chain support)
 *    d. Starts the catch-up replay via `start_catchup()`
 *
 * After catch-up completes, the machine ticks normally in the main loop
 * because `active_ui > 0`.
 */
world.afterEvents.entityContainerOpened.subscribe(({entity}) => {
	entity.active_ui = entity.active_ui ? entity.active_ui + 1 : 1;

	// Catch up dormant machine when a player opens it
	const machineData = machine_entities.get(entity.id);
	if (!machineData || !machineData.sleepTick) return;

	const machineSleepTick = machineData.sleepTick;
	const elapsed = system.currentTick - machineSleepTick;
	delete machineData.sleepTick; // wake it up
	// Clear persisted sleep on the entity
	try { entity.setDynamicProperty("sleep_tick", undefined); } catch (e) {}

	if (elapsed <= 0) return;

	const data = machines[machineData.type];
	if (!data) return;

	let block;
	try { block = entity.dimension.getBlock(machineData.location); } catch (e) {}
	if (!block) return;

	// Catch up neighboring dormant machines first (hopper chains)
	wake_neighbors(entity, machineData);

	// Run catch-up spread across frames via self-clearing runInterval
	start_catchup(entity, block, data, elapsed, machineSleepTick);
}, {entityFilter: {families: ["machine"]}});

/**
 * Container Close handler — puts machines to sleep when all players close the UI.
 *
 * When a player closes a machine's container:
 * 1. Decrements `entity.active_ui` counter
 * 2. If counter reaches 0 (no more players viewing):
 *    a. Deletes `active_ui` from the entity
 *    b. Records `sleepTick = currentTick` in the machine registry
 *    c. Persists `sleep_tick` to entity dynamic property (survives chunk unload)
 *    d. Machine will be skipped in next tick loop iteration
 *
 * Machines in the `ALWAYS_TICK` set are never put to sleep.
 */
world.afterEvents.entityContainerClosed.subscribe(({entity}) => {
	if (entity.active_ui === undefined) return;
	entity.active_ui -= 1;
	if (entity.active_ui <= 0) {
		delete entity.active_ui;
		// Mark the machine as going to sleep NOW
		const machineData = machine_entities.get(entity.id);
		if (machineData && !ALWAYS_TICK.has(machineData.type)) {
			machineData.sleepTick = system.currentTick;
			// Persist to entity dynamic property so it survives chunk unload
			try { entity.setDynamicProperty("sleep_tick", system.currentTick); } catch (e) {}
		}
	}
}, {entityFilter: {families: ["machine"]}});