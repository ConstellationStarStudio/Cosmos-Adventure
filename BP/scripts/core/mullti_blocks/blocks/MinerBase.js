import { system, world } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";
import { machine_buttons, setup_ui_button } from "../../machines/MachineButtons.js";
import { reload_vehicle } from "../../vehicles/Vehicle.js";

const BatterySlot = 72;
const EnergyDisplay = 73;
const ButtonSlot = 74;
const data = {
	energy: {rate: 20, capacity: 16000, maxInput: 50},
	onTick: onTick,
	onPlace: onPlace,
	onBreak(event){
		const { block, dimension, brokenBlockPermutation: perm } = event;
		let state = perm.getState("cosmos:miner_pos");
		if(!state) return;
		let {x, y, z} = block.location;
		let vector = [{x: 1, z: 1}, {x: -1, z: -1}, {x: 1, z: -1}, {x: -1, z: 1}][(state > 4 ? state - 5: state - 1)];
		block.dimension.runCommand(`fill ${x + vector.x} ${y + ((state > 4) ? -1: 1)} ${z + vector.z} ${x} ${y} ${z} air destroy`)
		
		const entity = dimension.getEntities({
			type: "cosmos:astro_miner_base",
			location: {
				x: ((x + vector.x) + x)/2 + 0.5,
				y: y + ((state > 4) ? -0.5: 0.5) - 0.5,
				z: ((z + vector.z) + z)/2 + 0.5,
			},
			maxDistance: 0.5,
		})[0];
		return entity;
	}
}

function onTick(astro_miner_base){
	let miner_data = load_dynamic_object(astro_miner_base, "multi_block_data") ?? {};
	const container = astro_miner_base.getComponent("minecraft:inventory").container;
    let miner_id = miner_data.miner_id;
	let energy = miner_data.energy ?? 0;
	let astro_miner;
	if(miner_id){
		astro_miner = world.getEntity(miner_id);
		if(!astro_miner?.isValid) miner_id = undefined;
	}

	energy = charge_from_battery(astro_miner_base, energy, BatterySlot)
    if(!(system.currentTick % 20)) astro_miner_base.addEffect("invisibility", 9999, {showParticles: false});

	container.add_ui_display(EnergyDisplay, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.round((energy / data.energy.capacity) * 66))
	save_dynamic_object(astro_miner_base, {miner_id, energy}, "multi_block_data")
}


function find_target_points(location, rotation){
	let target = {x: location.x, y: 0, z: location.z};

	let x_modifier = Math.round(Math.cos((rotation + 90)/57.3)); 
	let z_modifier = Math.round(Math.sin((rotation + 90)/57.3));

	target.x += (Math.round(Math.random() * 16) + 32) * x_modifier;
	target.z += (Math.round(Math.random() * 16) + 32) * z_modifier;

	let miny = Math.max(5, Math.floor(Math.min(location.y * 2 - 90, location.y - 22)));
	target.y = miny + 5 + Math.floor(Math.random() * 4);

	let points = [];
	points.push(target);

	if(rotation == 90 || rotation == 270){
		x_modifier = -1; z_modifier = 0;
	}else{
		x_modifier = 0; z_modifier = -1;
	}

	points.push({x: target.x + 13 * x_modifier, y: target.y, z: target.z + 13 * z_modifier});
	points.push({x: target.x - 13 * x_modifier, y: target.y, z: target.z - 13 * z_modifier});

	if(target.y > 17){
		points.push({x: target.x + 7 * x_modifier, y: target.y - 11, z: target.z + 7 * z_modifier})
		points.push({x: target.x - 7 * x_modifier, y: target.y - 11, z: target.z - 7 * z_modifier})
	}else{
		points.push({x: target.x + 26 * x_modifier, y: target.y, z: target.z + 26 * z_modifier})
		points.push({x: target.x - 26 * x_modifier, y: target.y, z: target.z - 26 * z_modifier})
	}

	points.push({x: target.x + 7 * x_modifier, y: target.y + 11, z: target.z + 7 * z_modifier})
	points.push({x: target.x - 7 * x_modifier, y: target.y + 11, z: target.z - 7 * z_modifier})

	if(target.y < location.y - 38){
        points.push({x: target.x + 13 * x_modifier, y: target.y + 22, z: target.z + 13 * z_modifier})
        points.push({x: target.x, y: target.y + 22, z: target.z});
		points.push({x: target.x - 13 * x_modifier, y: target.y + 22, z: target.z - 13 * z_modifier})
    }

	x_modifier = Math.round(Math.cos((rotation + 90)/57.3)); 
	z_modifier = Math.round(Math.sin((rotation + 90)/57.3));
	const s = points.length;
	for (let i = 0; i < s; i++){
		let vector = points[i];
        points.push({x: vector.x + 30 * x_modifier, y: vector.y, z: vector.z + 30 * z_modifier});
    }

	return points;
}

function onPlace(event) {
	const { block, permutationToPlace: perm } = event;
	let {x, y, z} = block.location;
	//i don't have enough iq to make it fully generated in loop so it is as it is
	let vectors = [[{x: -1, z: 1}, {x: -1, z: 0}, {x: 0, z: 1}], [{x: 1, z: 1}, {x: 1, z: 0}, {x: 0, z: 1}],
	[{x: 1, z: -1}, {x: 1, z: 0}, {x: 0, z: -1}], [{x: -1, z: -1}, {x: 0, z: -1}, {x: -1, z: 0}]];

	let broken_permutations = [{"00": 4, "-10": 1, "01": 2, "-11": 3}, {"00": 1, "10": 4, "01": 3, "11": 2},
	{"00": 3, "1-1": 4, "10": 2, "0-1": 1}, {"00": 2, "-1-1": 1, "0-1": 4, "-10": 3}];

	let base_vector = undefined;
	let base_y = undefined;
	let base_index = undefined;

	y_loop: for(let y_b of [-1, 1]){
		if(block.dimension.getBlock({x: x, y: y + y_b, z: z}).permutation.getState("cosmos:miner_pos") !== 0) continue;
		vector_loop: for(let [index, element] of vectors.entries()){
			for(let vector of element){
				let block_1 = block.dimension.getBlock({x: x + vector.x, y: y + y_b, z: z + vector.z});
				let block_2 = block.dimension.getBlock({x: x + vector.x, y: y, z: z + vector.z});
				if(block_1.permutation.getState("cosmos:miner_pos") === 0 && block_2.permutation.getState("cosmos:miner_pos") === 0) continue;
				else {continue vector_loop; break;}
			}
			base_y = y_b;
			base_vector = element;
			base_vector.push({x: 0, z: 0});
			base_index = index;
			break y_loop;
			break;
		}
	}
	if(base_vector){
		let center = {x: 0, y: 0, z: 0};
		for(let position of base_vector){
			center.x += x + position.x; center.y += (2 * y) + base_y; center.z += z + position.z;
			let block_index = broken_permutations[base_index][`${position.x}` + `${position.z}`];
			if(base_y == 1){
				block.dimension.getBlock({x: x + position.x, y: y, z: z + position.z}).setPermutation(perm.withState("cosmos:miner_pos", block_index));
				block.dimension.getBlock({x: x + position.x, y: y + base_y, z: z + position.z}).setPermutation(perm.withState("cosmos:miner_pos", block_index + 4));
			}else{
				block.dimension.getBlock({x: x + position.x, y: y, z: z + position.z}).setPermutation(perm.withState("cosmos:miner_pos", block_index + 4));
				block.dimension.getBlock({x: x + position.x, y: y + base_y, z: z + position.z}).setPermutation(perm.withState("cosmos:miner_pos", block_index));
			}
		}
		center.x = center.x/4 + 0.5; center.y = center.y/8 - 0.5; center.z = center.z/4 + 0.5;
		let base = block.dimension.spawnEntity("cosmos:astro_miner_base", center);
		setup_ui_button(base, ButtonSlot, "Recall");
		return base;
	}
} export default data;

const buttons = []; machine_buttons.set('cosmos:astro_miner_base', buttons)
buttons[ButtonSlot] = function (entity, item) {
	const container = entity.getComponent('minecraft:inventory').container;
	let info = load_dynamic_object(entity, "multi_block_data");

	let miner = world.getEntity(info.miner_id);
	if(miner?.isValid){
		let miner_info = load_dynamic_object(miner, "vehicle_data");
		if(miner_info.ai_state > 1 && miner_info.ai_state < 4){
			miner_info.ai_state = 4;
			miner_info.path_blocked_count = 0;
			save_dynamic_object(miner, miner_info, "vehicle_data")
		}
	}
	item.nameTag = "Recall"
	container.setItem(ButtonSlot, item)
}

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
	if(event.target.typeId == "cosmos:astro_miner_base" && event.itemStack?.typeId == "cosmos:astro_miner_item"){
		const { target: base, itemStack: item } = event;
		let base_data = load_dynamic_object(base, "multi_block_data") ?? {};
		if(base_data?.miner_id) return;

		system.run(() => {
			let rotation = base.getProperty("cosmos:rotation");
			let {x, y, z} = base.location;

			let spawn_pos = {x: x + Math.round(Math.cos((rotation + 90)/57.3)), y: y, z: z + Math.round(Math.sin((rotation + 90)/57.3))};
			let astro_miner = base.dimension.spawnEntity("cosmos:astro_miner", spawn_pos);
			astro_miner.setProperty("cosmos:rotation_y", rotation);
            
			let target_points = find_target_points(base.location, rotation);

			reload_vehicle(astro_miner);

			let facings = {0: "south", 180: "north", 90: "west", 270: "east"};
			save_dynamic_object(astro_miner, {base_id: base.id, base_pos: {x: spawn_pos.x, y: y  + 1,
				z: spawn_pos.z}, base_facing: facings[`${rotation}`], rotation: {x: 0, y: rotation},
				ai_face: facings[`${rotation}`],
				targ_rot: {x: 0, y: rotation}, player_id: event.player.id, base_blocks: {x: x, y: y, z: z}}, "vehicle_data");
			
			base_data.miner_id = astro_miner.id;
			save_dynamic_object(astro_miner, [], "vehicle_data", "waypoints");
			save_dynamic_object(astro_miner, [], "vehicle_data", "minepoints");

			save_dynamic_object(base, target_points, "multi_block_data", "target_points");
			save_dynamic_object(base, base_data, "multi_block_data")
        });
		event.cancel = true;
	}
});

export function rotate_base(block, perm){
	let state = perm.getState("cosmos:miner_pos");
    if(!state) return;
	let {x, y, z} = block.location;
	let vector = [{x: 1, z: 1}, {x: -1, z: -1}, {x: 1, z: -1}, {x: -1, z: 1}][(state > 4 ? state - 5: state - 1)];

	const base = block.dimension.getEntities({
	type: "cosmos:astro_miner_base", location: { x: ((x + vector.x) + x)/2 + 0.5,
		y: y + ((state > 4) ? -0.5: 0.5) - 0.5,
		z: ((z + vector.z) + z)/2 + 0.5,
	}, maxDistance: 0.5, })[0];
	if(!base) return;
	let miner_data = load_dynamic_object(base, "multi_block_data") ?? {};
	if(miner_data?.miner_id) return;

    let rotation = base.getProperty("cosmos:rotation");
	rotation += 90;
	rotation %= 360;
	base.setProperty("cosmos:rotation", rotation);
}

export function find_next_target_base(base){
	let target_points = load_dynamic_object(base, "multi_block_data", "target_points");

	if(target_points.length){
		let pos = target_points.shift();
		if(pos){
			save_dynamic_object(base, target_points, "multi_block_data", "target_points");
			return pos;
		}
	}

	// No more mining targets, the whole area is mined
    return undefined;
}