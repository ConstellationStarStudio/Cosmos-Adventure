import { system } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { load_dynamic_object, location_of_side, save_dynamic_object } from "../../../api/utils.js";
import { pads } from "../../vehicles/Vehicle.js";

const BatterySlot = 0;

function get_targets(block) {
	if(!block?.isValid) return [];
	let {x, y, z} = block.location;
	let targets = [];

	try {
		let front = location_of_side(block, "front");
		let back = location_of_side(block, "back");

		const front_offset = {x: (front.x - x) * 2, z: (front.z - z) * 2};
		const back_offset = {x: (back.x - x) * 2, z: (back.z - z) * 2};

		let front_pad = block.dimension.getBlock({x: x + front_offset.x, y: y, z: z + front_offset.z});
		let back_pad = block.dimension.getBlock({x: x + back_offset.x, y: y, z: z + back_offset.z});

		[front_pad, back_pad].forEach(pad => {
			if (pad?.permutation?.getState("cosmos:center")) {
				let family = pads[pad.typeId];
				if (family) {
					let v = pad.dimension.getEntities({families: [family], location: pad.center(), maxDistance: 2})[0];
					if (v && v.getComponent('minecraft:inventory')) targets.push(v);
				}
			}
		});
	} catch {}

	const sides = [
		{x: 1, y: 0, z: 0}, {x: -1, y: 0, z: 0},
		{x: 0, y: 1, z: 0}, {x: 0, y: -1, z: 0},
		{x: 0, y: 0, z: 1}, {x: 0, y: 0, z: -1}
	];

	for (let offset of sides) {
		try {
			let adj = block.dimension.getBlock({x: x + offset.x, y: y + offset.y, z: z + offset.z});
			if (adj && adj.getComponent('minecraft:inventory')) {
				targets.push(adj);
			}
		} catch {}
	}

	return [...new Set(targets)];
}

const data = {
	energy: {input: "right", capacity: 16000, maxInput: 120},
	items: {
		bottom_output: [1,2,3,4,5,6,7,8,9,10,11,12,13,14],
		side_output: [1,2,3,4,5,6,7,8,9,10,11,12,13,14]
	},
	onTick(entity, block) {
		const container = entity.getComponent('minecraft:inventory').container;
		const variables = load_dynamic_object(entity, "machine_data");
		let energy = variables.energy ?? 0;
		
		energy = charge_from_machine(entity, block, energy);
		energy = charge_from_battery(entity, energy, BatterySlot);

		if (energy >= 45) {
			let targets = entity.targets ?? [];
			if (system.currentTick % 20 === 0 || !entity.targets) {
				targets = get_targets(block);
				entity.targets = targets;
			}
			
			let moved = false;
			for (let target of targets) {
				if (!target?.isValid) continue;
				let target_inv = target.getComponent('minecraft:inventory');
				if (!target_inv) continue;
				let target_container = target_inv.container;
				
				for (let i = 0; i < target_container.size; i++) {
					let item = target_container.getItem(i);
					if (item) {
						let remainder = item.clone();
						let added = false;
						
						for (let j = 1; j <= 14; j++) {
							let slotItem = container.getItem(j);
							if (!slotItem) {
								container.setItem(j, remainder);
								remainder = undefined;
								added = true;
								break;
							} else if (slotItem.isStackableWith(remainder) && slotItem.amount < slotItem.maxAmount) {
								let space = slotItem.maxAmount - slotItem.amount;
								if (remainder.amount <= space) {
									slotItem.amount += remainder.amount;
									container.setItem(j, slotItem);
									remainder = undefined;
									added = true;
									break;
								} else {
									remainder.amount -= space;
									slotItem.amount = slotItem.maxAmount;
									container.setItem(j, slotItem);
									added = true;
								}
							}
						}

						if (added) {
							target_container.setItem(i, remainder);
							moved = true;
							energy -= 45;
							break;
						}
					}
				}
				if (moved) break;
			}
		}
		// UI UPDATE
		container.add_ui_display(15, '', Math.round((energy / data.energy.capacity) * 55));
		container.add_ui_display(16, '§rStatus: ' + (energy >= 45 ? "Running" : "Idle"));

		save_dynamic_object(entity, {energy}, "machine_data");
	}
};
export default data;
