import { system } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object, getRandomItemSlot } from "../../../api/utils"
import { charge_from_machine, charge_from_battery } from "../../matter/electricity"
import { input_fluid } from "../../matter/fluids"

const EnergyDisplay = 14, FluidDisplay = 15;
const BTN_TREES = 16, BTN_GRASS = 17, BTN_BUBBLE = 18;
const MAX_BUBBLE_SIZE = 15.0;

const TERRAFORMABLE = new Set([
	'minecraft:stone', 'minecraft:cobblestone', 'minecraft:sand', 'minecraft:gravel', 'minecraft:dirt', 
	'minecraft:netherrack', 'minecraft:end_stone',
	'cosmos:moon_turf', 'cosmos:moon_rock', 'cosmos:moon_dirt',
	'cosmos:mars_cobblestone', 'cosmos:mars_surface_rock', 'cosmos:mars_sub_surface_rock',
	'cosmos:venus_rock', 'cosmos:venus_pumice',
	'cosmos:asteroid_rock'
]);

// Transient lists (regenerated every 60 ticks)
const blockLists = new Map(); // entity.id -> { terraformable: [], grass: [], trees: [] }

function consume_bonemeal(container, variables) {
	variables.useCount = (variables.useCount || 0) + 1;
	if (variables.useCount % 4 === 0) {
		let slot = getRandomItemSlot(container, 2, 5);
		if (slot !== -1) {
			let item = container.getItem(slot);
			if (item.amount > 1) {
				item.amount -= 1;
				container.setItem(slot, item);
			} else {
				container.setItem(slot, undefined);
			}
		}
	}
}

const data = {
	energy: {input: "left", capacity: 16000, maxInput: 400},
	water: {input: "right", capacity: 2000},
	items: {
		// Real slots:
		// 0: Water bucket
		// 1: Battery
		// 2-5: Bonemeal
		// 6-9: Saplings
		// 10-13: Seeds
	},
	onTick(entity, block) {
		const container = entity.getComponent('minecraft:inventory').container
		const variables = load_dynamic_object(entity, "machine_data")
		
		let energy = variables.energy || 0;
		let water = variables.water || 0;
		let treesDisabled = variables.treesDisabled || false;
		let grassDisabled = variables.grassDisabled || false;
		let shouldRenderBubble = variables.shouldRenderBubble ?? true;
		let bubbleSize = variables.bubbleSize || 0;

		// Handle UI toggles
		container.add_ui_button(BTN_TREES, treesDisabled ? 'Enable Trees' : 'Disable Trees', entity, 'treesDisabled', !treesDisabled);
		container.add_ui_button(BTN_GRASS, grassDisabled ? 'Enable Grass' : 'Disable Grass', entity, 'grassDisabled', !grassDisabled);
		container.add_ui_button(BTN_BUBBLE, shouldRenderBubble ? 'Hide Bubble' : 'Show Bubble', entity, 'shouldRenderBubble', !shouldRenderBubble);

		// Input processing
		energy = charge_from_battery(entity, energy, 1); // battery slot 1
		energy = charge_from_machine(entity, block, energy)
		water = input_fluid({type: "water", slot: "water", extract_slot: 0}, entity, block, water)

		let hasEnergy = energy >= 10;
		let hasWater = water > 0;
		let hasBonemeal = getRandomItemSlot(container, 2, 5) !== -1;
		let hasSapling = getRandomItemSlot(container, 6, 9) !== -1;
		let hasSeed = getRandomItemSlot(container, 10, 13) !== -1;

		let isActive = (bubbleSize >= MAX_BUBBLE_SIZE - 0.1) && hasEnergy && hasBonemeal && hasWater;

		// Expand / Shrink bubble
		if (hasEnergy && (!grassDisabled || !treesDisabled)) {
			bubbleSize = Math.min(MAX_BUBBLE_SIZE, bubbleSize + 0.1);
			energy -= 10;
		} else {
			bubbleSize = Math.max(0, bubbleSize - 0.1);
			if(!(system.currentTick % 80)) energy -= Math.min(1, energy);
		}

		if (!blockLists.has(entity.id)) {
			blockLists.set(entity.id, { terraformable: [], grass: [], trees: [] });
		}
		let lists = blockLists.get(entity.id);

		// Every 60 ticks: Scan area
		if (system.currentTick % 60 === 0 && isActive) {
			lists.terraformable = [];
			lists.grass = [];
			
			let r = Math.floor(bubbleSize);
			let rSq = bubbleSize * bubbleSize;
			let dim = block.dimension;
			let {x: cx, y: cy, z: cz} = block.location;
			
			let doGrass = !grassDisabled && hasSeed;
			let doTrees = !treesDisabled && hasSapling;
			
			if (doGrass || doTrees) {
				for (let dx = -r; dx <= r; dx++) {
					for (let dy = -r; dy <= r; dy++) {
						for (let dz = -r; dz <= r; dz++) {
							if (dx*dx + dy*dy + dz*dz <= rSq) {
								let lx = cx + dx, ly = cy + dy, lz = cz + dz;
								try {
									let b = dim.getBlock({x: lx, y: ly, z: lz});
									if (b && !b.isAir) {
										if (doGrass && TERRAFORMABLE.has(b.typeId)) {
											lists.terraformable.push({x: lx, y: ly, z: lz});
										} else if (doTrees && b.typeId === 'minecraft:grass') {
											let up = dim.getBlock({x: lx, y: ly + 1, z: lz});
											if (up && up.isAir) {
												lists.grass.push({x: lx, y: ly, z: lz});
											}
										}
									}
								} catch(e) {}
							}
						}
					}
				}
			}
		}

		// Every 15 ticks: Execute Grass
		if (system.currentTick % 15 === 0 && lists.terraformable.length > 0) {
			let idx = Math.floor(Math.random() * lists.terraformable.length);
			let loc = lists.terraformable[idx];
			lists.terraformable.splice(idx, 1);
			
			try {
				let b = block.dimension.getBlock(loc);
				if (b && TERRAFORMABLE.has(b.typeId)) {
					// Minimal check for surrounding blocks to place water
					let waterChance = Math.random() < 0.025; // 1/40 chance
					if (waterChance) {
						b.setType('minecraft:water');
						water = Math.max(0, water - 50); // Using 50mb for water block
					} else {
						b.setType('minecraft:grass');
						consume_bonemeal(container, variables);
						water = Math.max(0, water - 1);
					}
				}
			} catch(e) {}
		}

		// Every 50 ticks: Execute Trees
		if (system.currentTick % 50 === 0 && lists.grass.length > 0 && !treesDisabled && hasSapling) {
			let idx = Math.floor(Math.random() * lists.grass.length);
			let loc = lists.grass[idx];
			lists.grass.splice(idx, 1);
			
			try {
				let b = block.dimension.getBlock(loc);
				if (b && b.typeId === 'minecraft:grass') {
					let upLoc = {x: loc.x, y: loc.y + 1, z: loc.z};
					
					// Distance check from existing trees to prevent overcrowding
					let tooClose = false;
					for (let t of lists.trees) {
						let dx = t.x - upLoc.x, dy = t.y - upLoc.y, dz = t.z - upLoc.z;
						if (dx*dx + dy*dy + dz*dz < 9) { tooClose = true; break; }
					}
					
					if (!tooClose) {
						let up = block.dimension.getBlock(upLoc);
						if (up && up.isAir) {
							up.setType('minecraft:oak_sapling'); // Default sapling for now
							lists.trees.push(upLoc);
							
							// Consume resources
							water = Math.max(0, water - 50);
							let sapSlot = getRandomItemSlot(container, 6, 9);
							if (sapSlot !== -1) {
								let item = container.getItem(sapSlot);
								if (item.amount > 1) {
									item.amount -= 1;
									container.setItem(sapSlot, item);
								} else {
									container.setItem(sapSlot, undefined);
								}
							}
							
							// Consume seed (1/4 chance)
							variables.useCount = (variables.useCount || 0) + 1;
							if (variables.useCount % 4 === 0) {
								let seedSlot = getRandomItemSlot(container, 10, 13);
								if (seedSlot !== -1) {
									let item = container.getItem(seedSlot);
									if (item.amount > 1) {
										item.amount -= 1;
										container.setItem(seedSlot, item);
									} else {
										container.setItem(seedSlot, undefined);
									}
								}
							}
						}
					}
				}
			} catch(e) {}
		}

		// Spawning highlight particles if bubble is visible (temporary visualization)
		if (shouldRenderBubble && bubbleSize > 2 && system.currentTick % 10 === 0) {
			let {x: cx, y: cy, z: cz} = block.location;
			block.dimension.spawnParticle("minecraft:villager_happy", {
				x: cx + (Math.random() - 0.5) * bubbleSize * 2,
				y: cy + (Math.random() - 0.5) * bubbleSize * 2,
				z: cz + (Math.random() - 0.5) * bubbleSize * 2
			});
		}

		variables.energy = energy;
		variables.water = water;
		variables.treesDisabled = treesDisabled;
		variables.grassDisabled = grassDisabled;
		variables.shouldRenderBubble = shouldRenderBubble;
		variables.bubbleSize = bubbleSize;
		save_dynamic_object(entity, variables, "machine_data")

		// UI display sync
		if (system.currentTick % 3 == 0) {
			// Status string calculation
			let status = 'A aTerraforming...';
			if (!hasEnergy) status = 'A 4No Energy';
			else if (grassDisabled && treesDisabled) status = 'A 6Disabled';
			else if (!hasWater) status = 'A 4No Water';
			else if (!hasBonemeal) status = 'A 4No Bonemeal';
			else if (!grassDisabled && !hasSeed) status = 'A 4No Seeds';
			else if (!treesDisabled && !hasSapling) status = 'A 4No Saplings';
			else if (bubbleSize < MAX_BUBBLE_SIZE - 0.5) status = 'A 2Bubble Expanding';
			else if (!treesDisabled && lists.grass.length === 0) status = 'A 4No Valid Blocks for Trees';
			else if (!grassDisabled && lists.terraformable.length === 0) status = 'A 4No Valid Blocks for Grass';

			container.add_ui_display(EnergyDisplay, `Energy Storage\nA aEnergy: ${Math.round(energy)} gJ\nA cMax Energy: ${data.energy.capacity} gJ\nA rStatus: ${status}`, Math.ceil((energy / data.energy.capacity) * 55))
			container.add_ui_display(FluidDisplay, `Fluid Tank\nA eWater: ${Math.round(water)} mB / ${data.water.capacity} mB`, Math.ceil((water / data.water.capacity) * 28)) // 28 is height for terraformer tank
		}
	}
}; export default data
