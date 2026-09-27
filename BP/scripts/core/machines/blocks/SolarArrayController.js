import { system, world } from "@minecraft/server";
import { load_dynamic_object, save_dynamic_object, compare_lists } from "../../../api/utils";
import { charge_battery } from "../../matter/electricity";

const data = {
	energy: { output: "back", capacity: 64000, maxPower: 1000 },
	items: {
		top_input: [0],
		side_input: [0],
	},
	onTick(entity, block) {
		const e = entity;
		let stopped = e.getDynamicProperty('stopped');
		if (stopped == undefined) {
			stopped = true;
			e.setDynamicProperty('stopped', true);
		}
		const container = e.getComponent('minecraft:inventory').container;

		const variables = load_dynamic_object(e, "machine_data");
		let energy = variables.energy || 0;
		let power = variables.power || 0;
		let connected_panels = variables.connected_panels || 0;
		let possible_panels = variables.possible_panels || 0;
		let environment = variables.environment || 0; // percentage
		let is_generating = variables.is_generating || 0;

		let first_values = [energy, power, connected_panels, possible_panels, environment, is_generating, stopped];

		if (container.was_ui_clicked(5, entity)) {
			stopped = !stopped;
			e.setDynamicProperty('stopped', stopped);
		}

		let planet = e.getPlanet();
		let time = planet ? planet.getTimeOfDay() : world.getTimeOfDay();
		let daylight_length = planet ? planet.time.day : 12000;
		let is_day_time = (time <= daylight_length);

		if (!(system.currentTick % 20)) {

			if (!stopped && block != undefined) {
				// Count connected solar array modules
				connected_panels = 0;
				possible_panels = 0;
				let { x, y, z } = block.location;
				
				let visited = new Set();
				let queue = [
					{x: x+1, y, z}, {x: x-1, y, z},
					{x, y, z: z+1}, {x, y, z: z-1}
				];
				
				while (queue.length > 0 && possible_panels < 1000) { // Safety limit 1000
					let curr = queue.shift();
					let key = `${curr.x},${curr.z}`;
					if (visited.has(key)) continue;
					visited.add(key);
					
					// Limit to 16 blocks radius
					if (Math.abs(curr.x - x) > 16 || Math.abs(curr.z - z) > 16) continue;
					
					try {
						let b = block.dimension.getBlock(curr);
						if (b && b.typeId === 'cosmos:solar_array_module') {
							possible_panels++;
							
							if (is_day_time) {
								let topmost_block = block.dimension.getTopmostBlock(curr);
								let valid = true;
								if (topmost_block && topmost_block.location.y > curr.y) {
									for (let cy = curr.y + 1; cy <= topmost_block.location.y && cy < 320; cy++) {
										let above = block.dimension.getBlock({x: curr.x, y: cy, z: curr.z});
										if (above && !above.isAir && !above.isLiquid) {
											valid = false;
											break;
										}
									}
								}
								if (valid) {
									connected_panels++;
								}
							}
							
							queue.push({x: curr.x+1, y, z: curr.z});
							queue.push({x: curr.x-1, y, z: curr.z});
							queue.push({x: curr.x, y, z: curr.z+1});
							queue.push({x: curr.x, y, z: curr.z-1});
						}
					} catch(e) {
						// Catch loaded chunk boundaries
					}
				}
				
				environment = is_day_time ? 100 : 0;
				let solarBoost = environment / 100;
				let generated = Math.floor(connected_panels * 6.3 * solarBoost);
				is_generating = Math.min(Math.max(generated, 0), 1000);
			} else {
				is_generating = 0;
				environment = 0;
				connected_panels = 0;
				possible_panels = 0;
			}
		}

		if (!stopped) {
			energy = Math.min(energy + is_generating, data.energy.capacity);
			energy = charge_battery(e, energy, 0); // Slot 0 is battery slot
		}
		
		power = Math.min(energy, data.energy.maxPower);
		save_dynamic_object(e, { energy, power, connected_panels, possible_panels, environment, is_generating }, "machine_data");

		// Update UI display if variables changed or battery item changed
		if (!compare_lists(first_values, [energy, power, connected_panels, possible_panels, environment, is_generating, stopped]) || !container.getItem(1)) {
			
			let status_info = '§6Disabled';
			if (!stopped) {
				if (!is_day_time || possible_panels === 0) {
					status_info = '§4Sun Is Not Visible';
				} else {
					let sunVisible = connected_panels / possible_panels;
					if (sunVisible === 0) {
						status_info = '§4Sun Is Not Visible';
					} else if (sunVisible < 1.0) {
						status_info = '§4Partially Blocked';
					} else if (is_generating > 0) {
						status_info = '§2Collecting Energy';
					} else {
						status_info = '§4Sun Is Not Visible';
					}
				}
			}
			
			const generating_text = `Generating: ${is_generating} gJ/t`;
			const status_text = `Status: ${status_info}`;
			const environment_text = `Environment: ${environment}%`;
			const connected_panels_text = `Connected Panels: ${connected_panels} / ${possible_panels}`;

			// Add UI Display
			// These correspond to the dynamic strings in the UI Datagen / Controller UI
			container.add_ui_display(1, generating_text);
			container.add_ui_display(2, status_text);
			container.add_ui_display(3, environment_text);
			container.add_ui_display(4, connected_panels_text);
			
			// Button ID 0 in datagen maps to UI index 5
			container.add_ui_button(5, stopped ? 'Enable' : 'Disable');
		}
	}
}; 

export default data;
