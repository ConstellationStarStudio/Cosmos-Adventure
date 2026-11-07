import { world, system, BlockPermutation } from "@minecraft/server"
import machines from "../machines/AllMachineBlocks.js"
import { get_entity, location_of_side, compare_position, six_neighbors, save_dynamic_object, save_machine_data } from "../../api/utils.js"
import { get_data } from "../machines/Machine.js"

export function str_pos(location) {
	if (!location) return
	const {x, y, z} = location
	return `${x} ${y} ${z}`
}

export const same_side = {
	above: "cosmos:up",
	below: "cosmos:down",
	north: "cosmos:north",
	south: "cosmos:south",
	east: "cosmos:east",
	west: "cosmos:west", 
}
export const opposite_side = {
	above: "cosmos:down",
	below: "cosmos:up",
	north: "cosmos:south",
	south: "cosmos:north",
	east: "cosmos:west", 
	west: "cosmos:east",
}

export function detach_wires(wire) {
	const neighbors = six_neighbors(wire)
	for (const side in neighbors) {
		const neighbor = neighbors[side]
		if (!neighbor.hasTag("wire")) continue
		const found_machines = wiresDFS(neighbor)
		neighbor.setPermutation(neighbor.permutation.withState(opposite_side[side], false))
		machinesSearch(found_machines, wire.dimension)
	}
}

function getSides(wireOs, permutation, wires, counter){
	let sides = permutation.getAllStates();
	let loc = wireOs.location;
	const blocks = {
		"cosmos:up": {x: loc.x, y: loc.y + 1, z: loc.z},
		"cosmos:down": {x: loc.x, y: loc.y - 1, z: loc.z},
		"cosmos:north": {x: loc.x, y: loc.y, z: loc.z - 1},
		"cosmos:south": {x: loc.x, y: loc.y, z: loc.z + 1},
		"cosmos:east": {x: loc.x + 1, y: loc.y, z: loc.z},
		"cosmos:west": {x: loc.x - 1, y: loc.y, z: loc.z}
	}
	for(let block in sides){
		if(!sides[block] || !blocks[block]) continue;
		let loc_as_string = JSON.stringify(blocks[block]);
		let wire_in_map = wires.get(loc_as_string);
		if(!wire_in_map){
			let wire_block = wireOs.dimension.getBlock(blocks[block]);
			let type = (wire_block?.hasTag("wire"))? "wire": undefined;

			if(type && wire_block?.hasTag("heavy_wire")) counter.heavy_wires++;
			else if(type) counter.wires++;

			wires.set(loc_as_string, {type: type, connected: type ? undefined: loc});
		}else if(wire_in_map.connected && !compare_position(loc, wire_in_map.connected)){
			wire_in_map.slot = "both";
			wires.set(loc_as_string, wire_in_map);
		}
	}
}
function wiresDFS(firstWire, perm = firstWire.permutation){
	let wiresWillDone = new Map();
	let foundMachines = [];
	let wiresIterator = wiresWillDone[Symbol.iterator]();

	let counter = {heavy_wires: firstWire.hasTag("heavy_wire") ? 1: 0, wires: 0};
	getSides(firstWire, perm, wiresWillDone, counter);
	
	for(let wire of wiresIterator){
		let block = firstWire.dimension.getBlock(JSON.parse(wire[0]));
		if(wire[1].type == "wire" && !block.isAir){
			getSides(block, block.permutation, wiresWillDone, counter)
		}
	}
	wiresWillDone.forEach((value, key) => {
		if(value.type == "wire") return;
		let block = firstWire.dimension.getBlock(JSON.parse(key));
		if(block.isAir || !block.hasTag("machine")) return;

		let machineData = get_data(block);
		let input = location_of_side(block, machineData.energy.input);
		let output = location_of_side(block, machineData.energy.output);
		let final_slot = (value.slot == "both")? "both":
		(input && compare_position(input, value.connected))? "input":
		(output && compare_position(output, value.connected))? "output":
		undefined;

		//so it's sets tier to 2 if all wires connected to input slot are heavy
		let energy_tier = {level: 1};
		if(final_slot && final_slot != "output" && counter.heavy_wires > 0 && counter.wires === 0 && block.dimension.getBlock(value.connected)?.hasTag("heavy_wire")){
			energy_tier = {level: 2};
		}
		
		foundMachines.push([block.location, final_slot, energy_tier])
	});
	return foundMachines;
}
export function machinesSearch(foundMachines, dimension){
	foundMachines.forEach((element) => {
		let final = dimension.getBlock(element[0]);
		let finalData = get_data(final);
		let inputSide = (finalData.energy.input)? final.dimension.getBlock(location_of_side(final, finalData.energy.input)):
		undefined;
		let outputSide = (finalData.energy.output)? final.dimension.getBlock(location_of_side(final, finalData.energy.output)):
		undefined;
		
		let connectedInputSide = (inputSide && !inputSide.isAir && inputSide.hasTag("wire"))? wiresDFS(inputSide): undefined;
		let connectedOutputSide = (outputSide && !outputSide.isAir && outputSide.hasTag("wire"))? wiresDFS(outputSide): undefined;
		let finalConnectedInputSide = (connectedInputSide)? connectedInputSide.filter((i) => !compare_position(i, element[0])): undefined;
		let finalConnectedOutputSide = (connectedOutputSide)? connectedOutputSide.filter((o) => !compare_position(o, element[0])): undefined;

		save_machine_data(final, element[2], "energy_tier")
		
		try{save_machine_data(final, finalConnectedInputSide, "input_connected_machines")}
		catch(undefined){}

		try{save_machine_data(final, finalConnectedOutputSide, "output_connected_machines")}
		catch(undefined){}
	});
}

// this function takes a Block (A Machine Block)
export function attach_to_wires(block) {
	const machine_type = block.typeId.split(':').pop()
	if (!Object.keys(machines).includes(machine_type) || !machines[machine_type].energy) return
	const machine = machines[machine_type]
	const connections = [
		location_of_side(block, machine.energy.input),
		location_of_side(block, machine.energy.output)
	]
	for (const connection of connections) {
		if (!connection) continue
		const wire = block.dimension.getBlock(connection)
		if (wire.hasTag("wire")) connect_wires(wire)
	}
	system.run(() => {
	let machineOutputWire = (machine.energy.output)? block.dimension.getBlock(connections[1]):
	undefined;
	let machineInputWire = (machine.energy.input)? block.dimension.getBlock(connections[0]):
	undefined;
	if(machineOutputWire && !machineOutputWire.isAir && machineOutputWire.hasTag("wire")) machinesSearch(wiresDFS(machineOutputWire), block.dimension)
	if(machineInputWire && !machineInputWire.isAir && machineInputWire.hasTag("wire")) machinesSearch(wiresDFS(machineInputWire), block.dimension)
	});
}
// this function takes a Block (A Wire)
function connect_wires(wire) {
	const neighbors = six_neighbors(wire)
	const states = {}
	for (const [side, block] of Object.entries(neighbors)) {
		if (block.hasTag("wire") && (!block.hasTag("switchable") || block.permutation.getState("cosmos:switch"))) {
			block.setPermutation(block.permutation.withState(opposite_side[side], true))
			states[same_side[side]] = true
		}
		const machine_type = block.typeId.split(':').pop()
		if (Object.keys(machines).includes(machine_type)) {
			const machine = machines[machine_type]
			const connections = [
				str_pos(location_of_side(block, machine.energy.input)),
				str_pos(location_of_side(block, machine.energy.output))
			]
			if (connections.includes(str_pos(wire.location))) states[same_side[side]] = true
		}
	}
	wire.setPermutation(BlockPermutation.resolve(wire.typeId, states))
	system.run(() => {machinesSearch(wiresDFS(wire), wire.dimension)});
}

export const aluminum_wire_component = {
	onPlace({block}) {
		connect_wires(block)
	},
	onPlayerBreak(event){
		detach_wires(event.block)
		machinesSearch(wiresDFS(event.block, event.brokenBlockPermutation), event.block.dimension)
	}
}

export const switchable_wire_component = {
	onRedstoneUpdate({block, powerLevel}) {
        if (powerLevel){
			 block.setPermutation(BlockPermutation.resolve(block.typeId, { "cosmos:up": false, "cosmos:down": false,
			"cosmos:north": false, "cosmos:east": false, "cosmos:south": false, "cosmos:west": false,  "cosmos:switch": false}));
			detach_wires(block)
		}
        else{
			connect_wires(block)
			block.setPermutation(block.permutation.withState("cosmos:switch", true));
		}
    }
}