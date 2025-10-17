import { world, system, BlockPermutation } from "@minecraft/server"
import machines from "../machines/AllMachineBlocks.js"
import { get_entity, location_of_side, compare_position } from "../../api/utils.js"
import { get_data } from "../machines/Machine.js"

function str_pos(location) {
	if (!location) return
	const {x, y, z} = location
	return`${x} ${y} ${z}`
}

const faces = ["cosmos:up", "cosmos:north", "cosmos:east", "cosmos:west", "cosmos:south", "cosmos:down"]

export function detach_wires(wire) {
	const neighbors = wire.getNeighbors(6);
	for (const [i, wireNeighbor] of neighbors.entries()) {
		if (wireNeighbor.typeId == 'cosmos:aluminum_wire') {
			const side_connections = wireNeighbor.permutation.getAllStates()
			side_connections[faces[5 - i]] = false
			let foundMachines = wiresDFS(wireNeighbor)
			wireNeighbor.setPermutation(BlockPermutation.resolve("cosmos:aluminum_wire", side_connections))
			machinesSearch(foundMachines)
		}
	}
}
function getSides(wireOs, permutation, wires){
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
			wires.set(loc_as_string, {type: (wireOs.dimension.getBlock(blocks[block]).typeId == "cosmos:aluminum_wire")? "wire": undefined, connected: (wireOs.dimension.getBlock(blocks[block]).typeId != "cosmos:aluminum_wire")? loc: undefined})
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
	getSides(firstWire, perm, wiresWillDone);
	for(let wire of wiresIterator){
		let block = firstWire.dimension.getBlock(JSON.parse(wire[0]));
		if(wire[1].type == "wire" && !block.isAir){
			getSides(block, block.permutation, wiresWillDone)
		}
	}
	wiresWillDone.forEach((value, key) => {
		if(value.type == "wire") return;
		let block = firstWire.dimension.getBlock(JSON.parse(key));
		if(block.isAir) return;
		let machineEntity = get_entity(block.dimension, block.center(), "cosmos");
		if(!machineEntity) return;
		
		let machineData = get_data(machineEntity);
		let input = location_of_side(block, machineData.energy.input);
		let output = location_of_side(block, machineData.energy.output);
		let final_slot = (value.slot == "both")? "both":
		(input && compare_position(input, value.connected))? "input":
		(output && compare_position(output, value.connected))? "output":
		undefined;

		foundMachines.push([machineEntity.id, final_slot])
	});
	return foundMachines;
}
export function machinesSearch(foundMachines){
	foundMachines.forEach((element) => {
		let final = world.getEntity(element[0])
		let finalData = get_data(final)
		let inputSide = (finalData.energy.input)? final.dimension.getBlock(location_of_side(final.dimension.getBlock(final.location), finalData.energy.input)):
		undefined;
		let outputSide = (finalData.energy.output)? final.dimension.getBlock(location_of_side(final.dimension.getBlock(final.location), finalData.energy.output)):
		undefined;
		
		let connectedInputSide = (inputSide && !inputSide.isAir && inputSide.typeId == 'cosmos:aluminum_wire')? wiresDFS(inputSide): undefined;
		let connectedOutputSide = (outputSide && !outputSide.isAir && outputSide.typeId == 'cosmos:aluminum_wire')? wiresDFS(outputSide): undefined;
		let finalConnectedInputSide = (connectedInputSide)? connectedInputSide.filter((element) => element[0] != final.id): undefined;
		let finalConnectedOutputSide = (connectedOutputSide)? connectedOutputSide.filter((element) => element[0] != final.id): undefined;
		final.setDynamicProperty("input_connected_machines", JSON.stringify(finalConnectedInputSide))
		final.setDynamicProperty("output_connected_machines", JSON.stringify(finalConnectedOutputSide))
	});
}

const same_side = {
	above: "cosmos:up",
	below: "cosmos:down",
	north: "cosmos:north",
	south: "cosmos:south",
	east: "cosmos:east",
	west: "cosmos:west", 
}
const opposite_side = {
	above: "cosmos:down",
	below: "cosmos:up",
	north: "cosmos:south",
	south: "cosmos:north",
	east: "cosmos:west", 
	west: "cosmos:east",
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
		if (wire.typeId == "cosmos:aluminum_wire") connect_wires(wire)
	}
	system.run(() => {
	let machineOutputWire = (machine.energy.output)? block.dimension.getBlock(connections[1]):
	undefined;
	let machineInputWire = (machine.energy.input)? block.dimension.getBlock(connections[0]):
	undefined;
	if(machineOutputWire && !machineOutputWire.isAir && machineOutputWire.typeId == 'cosmos:aluminum_wire') machinesSearch(wiresDFS(machineOutputWire))
	if(machineInputWire && !machineInputWire.isAir && machineInputWire.typeId == 'cosmos:aluminum_wire') machinesSearch(wiresDFS(machineInputWire))
	});
}
// this function takes a Block (A Wire)
function connect_wires(wire) {
	const neighbors = wire.six_neighbors()
	const states = {}
	for (const [side, block] of Object.entries(neighbors)) {
		if (block.typeId == 'cosmos:aluminum_wire') {
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
	wire.setPermutation(BlockPermutation.resolve("cosmos:aluminum_wire", states))
	system.run(() => {machinesSearch(wiresDFS(wire))});
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('cosmos:aluminum_wire', {
		onPlace({block}) {
			connect_wires(block)
		},
		onPlayerBreak(event){
			detach_wires(event.block)
			machinesSearch(wiresDFS(event.block, event.brokenBlockPermutation))
		}
	})
})