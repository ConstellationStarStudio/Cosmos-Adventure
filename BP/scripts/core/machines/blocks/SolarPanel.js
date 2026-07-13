import { system, world, BlockVolume, BlockPermutation } from "@minecraft/server";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils";
import { remove } from "../../items/wrench";
import { charge_battery } from "../../matter/electricity";

//set or destroy the solar panel blocks
export function setSolarPanelBlocks(solar_panel, destroy = false) {
	let { x, y, z } = solar_panel.location;
	x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
	let dim = solar_panel.dimension;
	if (y > 253 || (!destroy && (!dim.getBlock({ x: x, y: y + 1, z: z }).isAir || dim.containsBlock(new BlockVolume({ x: x + 1, y: y + 2, z: z + 1 }, { x: x - 1, y: y + 2, z: z - 1 }), { excludeTypes: ["air"] })))) return undefined;

	system.run(() => {
		let panel_blocks = [[{ x: x, y: y + 1, z: z }, "cosmos:solar_panel_1"], [{ x: x, y: y + 2, z: z }], [{ x: x + 1, y: y + 2, z: z }],
		[{ x: x - 1, y: y + 2, z: z }], [{ x: x, y: y + 2, z: z + 1 }], [{ x: x, y: y + 2, z: z - 1 }],
		[{ x: x + 1, y: y + 2, z: z + 1 }], [{ x: x - 1, y: y + 2, z: z - 1 }], [{ x: x - 1, y: y + 2, z: z + 1 }], [{ x: x + 1, y: y + 2, z: z - 1 }]];

		for (let i = 0; i <= 9;) {
			let element = panel_blocks[i];
			let block = dim.getBlock(element[0]);
			let type = element[1] ?? "cosmos:solar_panel_2";
			type = destroy ? "air" : type;
			let states = (type == "cosmos:solar_panel_2") ? { "cosmos:panel_position": i } :
				{};
			block.setPermutation(BlockPermutation.resolve(type, states))
			i++;
		}
	});

	return true;
}

const panel_offsets = [
	{x: 0, y: -1, z: 0}, {x: 0, y: -2, z: 0}, {x: -1, y: -2, z: 0},
	{x: 1, y: -2, z: 0}, {x: 0, y: -2, z: -1}, {x: 0, y: -2, z: 1},
	{x: -1, y: -2, z: -1}, {x: 1, y: -2, z: 1}, {x: 1, y: -2, z: -1},
	{x: -1, y: -2, z: 1}
]

export const solar_panel_component = {
	onPlayerBreak({ block, brokenBlockPermutation: perm }) {
		let state = perm.getState("cosmos:panel_position") ?? 0;
		let main_block = block.offset(panel_offsets[state]);
		setSolarPanelBlocks(main_block, true);
		remove(main_block);
	},
}

const data = {
	"basic_solar_panel": {
		energy: { output: "back", capacity: 16000, maxPower: 200 },
	    items: {
		    top_input: [0],
		    side_input: [0],
	    },
	    multi_block: true,
		onTick: onTick,
		tier: 1
	},
    "advanced_solar_panel": {
	    energy: { output: "back", capacity: 30000, maxPower: 200 },
	    items: {
		    top_input: [0],
		    side_input: [0],
	    },
	    multi_block: true,
		onTick: onTick,
		tier: 2
	}
	
}; 

function onTick(entity, block) {
	const e = entity;
	let stopped = e.getDynamicProperty('stopped');
	if (stopped == undefined) stopped = true;
	const container = e.getComponent('minecraft:inventory').container;
	const panel_data = data[entity.typeId.replace('cosmos:', '')];

	const variables = load_dynamic_object(e, "machine_data");
	let energy = variables.energy || 0;
	let solar_strength = variables.solar_strength || 0;
	let power = variables.power || 0;
	let planet = e.getPlanet();
	let solar_boost = planet ? planet.solarEnergyMultiplier : 1;

	let time = planet ? planet.getTimeOfDay() : world.getTimeOfDay();
	let day_length = planet ? planet.time.length : 24000;
	let daylight_length = planet ? planet.time.day : 12000;

    let solar_angle = 1 / day_length * time;
    
	solar_angle = (solar_angle * 360) + 360;
    solar_angle %= 360;
	
	let is_day_time = (time <= daylight_length && (solar_angle < 180.5 || solar_angle > 350));

	let target_angle = 0;

	if(panel_data.tier == 2){
		if(!is_day_time) target_angle = 257.5;
		else if(solar_angle > 27.5 && solar_angle < 152.5) target_angle -= (target_angle - solar_angle + 12.5);
        else if (solar_angle <= 27.5 || solar_angle > 270) target_angle = 15;
        else if (solar_angle >= 152.5) target_angle = 140;
	}else{
		target_angle = is_day_time ? 77.5: 257.5
	}
	target_angle = target_angle < 0 ? 360:
	target_angle > 360 ? 0:
	target_angle;

	let old_current_angle = e.getProperty("cosmos:panel_angle") ?? 0;
	let current_angle = (old_current_angle + (target_angle - old_current_angle) / 20);
	current_angle = parseFloat(current_angle.toFixed(4));

	if (old_current_angle.toFixed(3) !== current_angle.toFixed(3)) e.setProperty("cosmos:panel_angle", current_angle);
	//e.setProperty("cosmos:panel_angle", 15);

	if (!(system.currentTick % 20)) {
		e.addEffect("invisibility", 9999, { showParticles: false });
		if (!stopped) {
			solar_strength = 0;
			if (is_day_time && block != undefined) {
				let { x, y, z } = block.location;
				let panel_blocks = [{ x: x, z: z }, { x: x + 1, z: z }, { x: x - 1, z: z }, { x: x, z: z + 1 }, { x: x, z: z - 1 },
				{ x: x + 1, z: z + 1 }, { x: x - 1, z: z - 1 }, { x: x - 1, z: z + 1 }, { x: x + 1, z: z - 1 }];

				panel_blocks.forEach((element) => {
					let topmost_block = e.dimension.getTopmostBlock(element);
					if (topmost_block != undefined && topmost_block.location.y == (y + 2)) solar_strength += 1;
				});
			}
		}
	}
	let generated_energy = 0;
	if (!stopped) {
		generated_energy = get_solar_energy(solar_strength, solar_angle, current_angle, solar_boost);
		generated_energy = Math.min(panel_data.energy.maxPower, generated_energy);
		energy = Math.min(energy + generated_energy, panel_data.energy.capacity);
		energy = charge_battery(e, energy, 0)
	}

	power = Math.min(energy, panel_data.energy.maxPower)
	save_dynamic_object(e, { energy, solar_strength, power }, "machine_data");

	const energy_hover = `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${panel_data.energy.capacity} gJ`
	const is_generating = `§r${power == 0 ? 'Generating: Not Generating' : 'Generating: ' + generated_energy + ' gJ/t'}`;
	let status = "§rStatus: ";
	let status_info = (stopped) ? '§6Disabled' :
	(solar_strength > 0 && solar_strength < 9) ? '§4Sun Partially Visible' :
	(solar_strength == 9) ? '§2Collecting Energy' :
	'§4Sun Is Not Visible';

	status = status + status_info;

	let solar = "Sun Visible: "
	solar = solar + (solar_strength / 9 * 100).toFixed(1) + "%"

	container.add_ui_display(1, energy_hover, Math.round((energy / panel_data.energy.capacity) * 55))
	container.add_ui_display(2, solar, solar_strength > 0 ? 55 : 0);

	container.add_ui_display(3, is_generating)
	container.add_ui_display(4, status)
	container.add_ui_display(5, `§rEnvinromental Boost: ${Math.floor(Math.round((solar_boost - 1) * 1000)/10)}.0%%`)

	container.add_ui_button(6, stopped ? 'Disable' : 'Enable', entity, 'stopped', !stopped)
}; export default data;

function get_solar_energy(solar_strength, solar_angle, current_angle, boost){
	let angles_difference = (180 - Math.abs((current_angle + 12.5) % 180 - solar_angle)) / 180;
	return Math.floor(0.01 * angles_difference ** 2 * (solar_strength * Math.abs(angles_difference) * 500) * boost);
}