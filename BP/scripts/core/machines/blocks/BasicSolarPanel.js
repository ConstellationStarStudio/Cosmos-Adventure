import { system, world, BlockVolume, BlockPermutation } from "@minecraft/server";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils";
import { remove } from "../../items/wrench";
import { get_data } from "../Machine";
import { charge_battery } from "../../matter/electricity";

//set or destroy the solar panel blocks
export function setSolarPanelBlocks(solar_panel, destroy = false){
  let {x, y, z} = solar_panel.location;
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  let dim = solar_panel.dimension;
  if (y > 253 || (!destroy && (!dim.getBlock({x: x, y: y + 1, z: z}).isAir || dim.containsBlock(new BlockVolume({x: x + 1, y: y + 2, z: z + 1}, {x: x - 1, y: y + 2, z: z - 1}), {excludeTypes: ["air"]})))) return undefined;

  system.run(() => {
    let panel_blocks = [[{x: x, y: y + 1, z: z}, "cosmos:solar_panel_1"], [{x: x, y: y + 2, z: z}], [{x: x + 1 , y: y + 2, z: z}],
    [{x: x - 1 , y: y + 2, z: z}], [{x: x , y: y + 2, z: z + 1}], [{x: x, y: y + 2, z: z - 1}],
    [{x: x + 1, y: y + 2, z: z + 1}], [{x: x - 1, y: y + 2, z: z - 1}], [{x: x - 1, y: y + 2, z: z + 1}], [{x: x + 1 , y: y + 2, z: z - 1}]];

    for (let i = 0; i < panel_blocks.length; i++) {
      let element = panel_blocks[i];
      let block = dim.getBlock(element[0]);
      let type = element[1] ?? "cosmos:solar_panel_2";
      type = destroy ? "air": type;
      let states = (type == "cosmos:solar_panel_2")? {"cosmos:panel_position": i}: {};
      block.setPermutation(BlockPermutation.resolve(type, states))
    }
  });

  return true;
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent('cosmos:solar_panel', {
    onPlayerBreak({ block, dimension, brokenBlockPermutation: perm }) {
      let {x, y, z} = block.location;
      let state = perm.getState("cosmos:panel_position") ?? 0;

      let panel_blocks = [{x: x, y: y - 1, z: z}, {x: x, y: y - 2, z: z}, {x: x - 1 , y: y - 2, z: z},
      {x: x + 1 , y: y - 2, z: z}, {x: x , y: y - 2, z: z - 1}, {x: x, y: y - 2, z: z + 1},
      {x: x - 1, y: y - 2, z: z - 1}, {x: x + 1, y: y - 2, z: z + 1}, {x: x + 1, y: y - 2, z: z - 1}, {x: x - 1 , y: y - 2, z: z + 1}];
      let main_block = dimension.getBlock(panel_blocks[state]);
      setSolarPanelBlocks(main_block, true);
      remove(main_block);
    },
  });
});

export default class {
  constructor(entity, block) {
    this.entity = entity;
    this.block = block;
    
    const vars = load_dynamic_object(this.entity, "machine_data") || {};
    this.energy = vars.energy || 0;
    this.solar_strength = vars.solar_strength || 0;
    this.power = vars.power || 0;
    
    this.lastSunCheck = 0;
    this.lastUiUpdate = 0;
  }

  tick(dt = 1, isViewed = false) {
    if (!this.entity.isValid) return;

    const e = this.entity;
    let stopped = e.getDynamicProperty('stopped') ?? true;
    const data = get_data(e);
    const container = e.getComponent('minecraft:inventory').container;

    const time = world.getTimeOfDay();
    const day_length = 24000; 
    const daylight_length = 12000;

    let solar_angle = (1/day_length * time) * 360;
    const is_day_time = (time <= daylight_length && (solar_angle < 180.5 || solar_angle > 359.5));

    const target_angle = is_day_time ? 0 : 180;
    const old_current_angle = e.getProperty("cosmos:panel_angle") ?? 0;
    
    // Animation smoothing
    let current_angle = old_current_angle + (target_angle - old_current_angle) / (20 / Math.max(1, dt));
    current_angle = Math.max(0, Math.min(180, parseFloat(current_angle.toFixed(4))));

    if (old_current_angle.toFixed(3) !== current_angle.toFixed(3)) {
        e.setProperty("cosmos:panel_angle", current_angle);
    }

    // Sunlight Visibility Check
    if (system.currentTick - this.lastSunCheck > 20) {
      e.addEffect("invisibility", 9999, {showParticles: false});
      if (!stopped) {
        this.solar_strength = 0;
        if (is_day_time && this.block && this.block.isValid) {
          const { x, y, z } = this.block.location;
          const panel_blocks = [{x: x, z: z}, {x: x + 1, z: z}, {x: x - 1, z: z}, {x: x, z: z + 1}, {x: x, z: z - 1},
          {x: x + 1, z: z + 1}, {x: x - 1, z: z - 1}, {x: x - 1, z: z + 1}, {x: x + 1, z: z - 1}];

          panel_blocks.forEach((element) => {
            try {
                const topmost_block = e.dimension.getTopmostBlock(element);
                if (topmost_block && topmost_block.location.y <= (y + 2)) this.solar_strength += 1;
            } catch(err) {}
          });
        }
      } else {
        this.solar_strength = 0;
      }
      this.lastSunCheck = system.currentTick;
    }

    // Generation Logic
    solar_angle = (1/day_length * time);
    solar_angle = (solar_angle < 0.18)? 1 - Math.abs(solar_angle - 0.18): solar_angle - 0.18;
    solar_angle = solar_angle * 360;

    const angles_difference = (180 - Math.abs((current_angle + 12.5) % 180 - solar_angle))/180;
    let generated_energy = Math.floor(0.01 * angles_difference ** 2 * (this.solar_strength * Math.abs(angles_difference) * 500));
    generated_energy = Math.min(data.energy.maxPower, generated_energy);

    if (!stopped) {
      const produced = Math.min(this.energy + (generated_energy * dt), data.energy.capacity) - this.energy;
      if (produced > 0) {
          this.energy += produced;
          // Charging batteries (approximate)
          for (let i = 0; i < Math.min(dt, 20); i++) {
              this.energy = charge_battery(e, this.energy, 0);
          }
      }
    }
    this.power = Math.min(this.energy, data.energy.maxPower);

    // Save and UI - Optimize to only save/update periodically or on significant change
    if (isViewed || system.currentTick - this.lastUiUpdate > 20 || !container.getItem(1)) {
        save_dynamic_object(e, { energy: Math.floor(this.energy), solar_strength: this.solar_strength, power: Math.floor(this.power) }, "machine_data");

        const energy_hover = `Energy Storage\n§aEnergy: ${Math.floor(this.energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`
        const is_generating = `§r${this.power == 0 ? 'Generating: Not Generating' : 'Generating: ' + generated_energy + ' gJ/t' }`;
        let status = "§rStatus: ";
        let status_info = (stopped)? '§6Disabled':
        (this.solar_strength > 0 && this.solar_strength < 9)? '§4Sun Partially Visible':
        (this.solar_strength == 9)? '§2Collecting Energy':
        '§4Sun Is Not Visible';
        status = status + status_info;

        let solar = "Sun Visible: " 
        solar = solar + (this.solar_strength/9 * 100).toFixed(1) + "%";

        if (isViewed || system.currentTick - this.lastUiUpdate > 20 || !container.getItem(1)) {
            container.add_ui_display(1, energy_hover, Math.round((this.energy / data.energy.capacity) * 55));
            container.add_ui_display(2, solar, this.solar_strength > 0 ? 55: 0);
            container.add_ui_display(3, is_generating);
            container.add_ui_display(4, status);
            container.add_ui_display(5, "§rEnvinromental Boost: 0.0%%");
            this.lastUiUpdate = system.currentTick;
        }
    }

    if (!container.getItem(6)) {
       this.entity.setDynamicProperty('stopped', !stopped);
       container.add_ui_button(6, !stopped ? 'Enable' : 'Disable');
    }

    // Return active state: True if running/generating or UI needs update, False if fully idle
    // If we generated energy or charged battery, we are active.
    // If sun check is due, we should be active to perform it.
    const isWorking = !stopped && (generated_energy > 0 || this.energy < data.energy.capacity);
    return isWorking || system.currentTick - this.lastUiUpdate > 20;
  }
}
