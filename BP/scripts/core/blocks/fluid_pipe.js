import { world, BlockPermutation, system } from "@minecraft/server"
import machines from "../machines/AllMachineBlocks.js"
import { str_pos } from "./aluminum_wire"
import { get_entity, six_neighbors } from "../../api/utils.js"
import { get_data } from "../machines/Machine.js"
import { compare_position, location_of_side } from "../../api/utils.js"
import { update_network, update_fluid } from "../matter/fluid_network.js"
import { load_dynamic_object } from "../../api/utils.js"

export function side_blocks(loc){ 
	return {
	"cosmos:fluid_up": {x: loc.x, y: loc.y + 1, z: loc.z},
	"cosmos:fluid_down": {x: loc.x, y: loc.y - 1, z: loc.z},
	"cosmos:fluid_north": {x: loc.x, y: loc.y, z: loc.z - 1},
	"cosmos:fluid_south": {x: loc.x, y: loc.y, z: loc.z + 1},
	"cosmos:fluid_east": {x: loc.x + 1, y: loc.y, z: loc.z},
	"cosmos:fluid_west": {x: loc.x - 1, y: loc.y, z: loc.z}
	}
}

export const pipe_same_side = {
	above: "cosmos:fluid_up",
	below: "cosmos:fluid_down",
	north: "cosmos:fluid_north",
	south: "cosmos:fluid_south",
	east: "cosmos:fluid_east",
	west: "cosmos:fluid_west", 
}
export const pipe_opposite_side = {
	above: "cosmos:fluid_down",
	below: "cosmos:fluid_up",
	north: "cosmos:fluid_south",
	south: "cosmos:fluid_north",
	east: "cosmos:fluid_west", 
	west: "cosmos:fluid_east",
}

export function get_direction(location){
	const sides = [
		[{x: 1, y: 0, z: 0}, 'east'],
		[{x: -1, y: 0, z: 0}, 'west'],
		[{x: 0, y: 0, z: 1}, 'south'],
		[{x: 0, y: 0, z: -1}, 'north'],
		[{x: 0, y: 1, z: 0}, 'up'],
		[{x: 0, y: -1, z: 0}, 'down']
	]
	for(let side of sides){
		if(side[0].x == location.x && side[0].y == location.y && side[0].z == location.z) return side[1]
	}
}
export function detach_pipes(block) {
	const neighbors = six_neighbors(block)
	for (const side in neighbors) {
		const pipe = neighbors[side]
		if (!pipe.hasTag("fluid_pipe")) continue
		pipe.setPermutation(pipe.permutation.withState(pipe_opposite_side[side], 0))
		system.run(() => { 
			fluidNetwork(find_connected_machines(pipe)?.foundMachines);
			system.runJob(update_fluid(pipe, "empty"))
		})
	}
}
export function attach_pipes(block){
	const data = Object.entries(machines[block.typeId.replace('cosmos:', '')]);
	data.forEach((slot) => {
		if(slot[0] == 'energy' || slot[0] == 'items') return;
		if(slot[1].input){
			const pipe = block.dimension.getBlock(location_of_side(block, slot[1].input));
			if(pipe?.hasTag("fluid_pipe")) connect_pipes(pipe)
		}
		if(slot[1].output){
			const pipe = block.dimension.getBlock(location_of_side(block, slot[1].output));
			if(pipe?.hasTag("fluid_pipe")) connect_pipes(pipe)
		}
	});
}
//attaching with using key
export function attach_to_machine(pipe){
	const location = pipe.location;
	const sides = pipe.permutation.getAllStates();
	const blocks = side_blocks(location);

	for(let block in sides){
		if(!blocks[block] || !sides[block]) continue;
		const machine = pipe.dimension.getBlock(blocks[block]);
		if(!machine || machine.isAir || !machines[machine.typeId.replace('cosmos:', '')]) continue;
		sides[block] = (sides[block] == 1)? 2: 1;
	}
	pipe.setPermutation(BlockPermutation.resolve(pipe.typeId, sides));
	system.run(() => { 
		let connected_machines = find_connected_machines(pipe)?.foundMachines;
		fluidNetwork(connected_machines); 
	});

}
function getSides(pipeOs, permutation, pipes){
	let sides = permutation.getAllStates();
	let loc = pipeOs.location;
	const blocks = side_blocks(loc);
	for(let block in sides){
		if(!sides[block] || !blocks[block]) continue;
		let loc_as_string = JSON.stringify(blocks[block]);
		let pipe_in_map = pipes.get(loc_as_string);
		if(!pipe_in_map){
			let connected_block = pipeOs.dimension.getBlock(blocks[block]);
			if(connected_block?.hasTag("fluid_pipe")) pipes.set(loc_as_string, {type: 'pipe', connected: undefined, block: connected_block});
			else pipes.set(loc_as_string, {type: undefined, connected: [loc], block: connected_block});
				
		}else if(pipe_in_map.connected){
			let position = pipe_in_map.connected.find((element) => !compare_position(loc, element));
			if(position){
				pipe_in_map.connected.push(loc);
			}
			pipes.set(loc_as_string, pipe_in_map);
		}
	}
}
function find_connected_machines(first_pipe, perm = first_pipe.permutation, initial_machine = undefined){
	if(!perm?.hasTag("fluid_pipe")) return;
	let pipesWillDone = new Map();
	let foundMachines = [];
	let pipesIterator = pipesWillDone[Symbol.iterator]();
	let pipes_counter = 0;
	getSides(first_pipe, perm, pipesWillDone);
	for(let pipe of pipesIterator){
		let block = pipe[1].block;
		if(pipe[1].type == "pipe" && !block.isAir){
			pipes_counter++;
			getSides(block, block.permutation, pipesWillDone)
		}
	}
	pipesWillDone.forEach((value, key) => {
		if(value.type == "pipe") return;
		let block = first_pipe.dimension.getBlock(JSON.parse(key));
		if(block.isAir) return;
		let machineEntity = get_entity(block.dimension, block.center(), "cosmos");
		if(!machineEntity) return;
		if(initial_machine && machineEntity.id == initial_machine) return;
		let machineData = Object.entries(get_data(machineEntity));
		let slots = [];
		let index = -1;
		machineData.forEach((slot) => {
			if(slot[0] == "energy" || (!slot[1].input && !slot[1].output)) return;
			index++;
			slots[index] = {type: slot[0]}
			if(slot[1].input) slots[index].input = location_of_side(block, slot[1].input)
            if(slot[1].output) slots[index].output = location_of_side(block, slot[1].output)
	    });

		let final_slot = {};

		value.connected.forEach((vector) => {
			slots.forEach((element) => {
				const input = element.input;
				const output = element.output;
                final_slot[element.type] = final_slot[element.type] ?? [];
				if(input && compare_position(input, vector)){
					final_slot[element.type].push("input")
				}
				if(output && compare_position(output, vector)){
					final_slot[element.type].push("output")
				}
				if(!final_slot[element.type].length) final_slot[element.type] = undefined;
			});
		});
		foundMachines.push([machineEntity.id, final_slot])
    });
	return {foundMachines, pipes_counter};
}

function connect_pipes(pipe) {
	const neighbors = six_neighbors(pipe)
	const states = {}
	for (const [side, block] of Object.entries(neighbors)) {
		if (block.hasTag("fluid_pipe")) {
			block.setPermutation(block.permutation.withState(pipe_opposite_side[side], 1))
			states[pipe_same_side[side]] = 1
			if(block.typeId != "cosmos:fluid_pipe"){
				let fluid_type = block.typeId.replace("cosmos:fluid_pipe_", "");
			    system.runJob(update_fluid(pipe, fluid_type))
			}
		}
		const machine_type = block.typeId.split(':').pop()
		if (Object.keys(machines).includes(machine_type)) {
			const machine = machines[machine_type]
			Object.entries(machine).forEach((element) => {
				if(element[0] == "energy") return;
				const connections = [
				    str_pos(location_of_side(block, element[1].input)),
				    str_pos(location_of_side(block, element[1].output))
			    ];
			    if(connections.includes(str_pos(pipe.location))) states[pipe_same_side[side]] = 1
			});
		}
	}
	pipe.setPermutation(BlockPermutation.resolve(pipe.typeId, states))
	system.run(() => { 
		let connected_machines = find_connected_machines(pipe)?.foundMachines;
		fluidNetwork(connected_machines); 
	});
}

export function fluidNetwork(foundMachines){
	if(!foundMachines?.length) return;
	for(let machine_data of foundMachines){
		let machine = world.getEntity(machine_data[0]);
		let machine_block = machine.dimension.getBlock(machine.location);
		const data = Object.entries(get_data(machine));
		let machines = {found_machines: {}};
		machines.pipe_count = {input: {}, output: {}};
		data.forEach((slot) => {
			if(slot[0] == 'energy' || (!slot[1].input && !slot[1].output)) return;
			
			if(slot[1].input){
				let input_side = machine.dimension.getBlock(location_of_side(machine_block, slot[1].input));
                if(input_side.hasTag("fluid_pipe")){
					let inputs = find_connected_machines(input_side, input_side.permutation, machine.id);
					machines.pipe_count.input[slot[0]] = inputs.pipes_counter ?? 0;
					if(inputs?.foundMachines?.length > 0){
						machines.found_machines[slot[0]] = machines.found_machines[slot[0]] ?? {};
						machines.found_machines[slot[0]].input = inputs?.foundMachines 
					}
				}
			}
			if(slot[1].output){
				let output_side = machine.dimension.getBlock(location_of_side(machine_block, slot[1].output));
				let direction = {x: machine_block.location.x - output_side.location.x, y: machine_block.location.y - output_side.location.y, z: machine_block.location.z - output_side.location.z }
				direction = pipe_same_side[get_direction(direction)];
                if(output_side.hasTag("fluid_pipe") && output_side.permutation.getState(direction) == 2){
					let outputs = find_connected_machines(output_side, output_side.permutation, machine.id);
					machines.pipe_count.output[slot[0]] = outputs.pipes_counter ?? 0;
					if(outputs?.foundMachines?.length > 0){
						machines.found_machines[slot[0]] = machines.found_machines[slot[0]] ?? {};
						machines.found_machines[slot[0]].output = outputs?.foundMachines;
					}
				}
			}
		});
		let old_list = JSON.parse(machine.getDynamicProperty("fluid_system") ?? "{}");
		let fluid_storage = load_dynamic_object(machine, 'machine_data', 'fluid_storage_entity');

		if(fluid_storage && Object.keys(fluid_storage).length > 0){
		    update_network(machine, fluid_storage, old_list, machines)
		}
		machine.setDynamicProperty("fluid_system", JSON.stringify(machines));
	}
}

export const fluid_pipe_component = {
	beforeOnPlayerPlace({block}) {
		system.run(() => {connect_pipes(block)});
	},
	onPlayerBreak({block}) {
		detach_pipes(block)
	},
}