import {system, world, BlockVolume, BlockPermutation} from "@minecraft/server";
import {load_dynamic_object, save_dynamic_object } from "../../../api/utils";
import { remove } from "../../items/wrench";
import { Planet } from "../../../planets/dimension/GalacticraftPlanets";

let planets_time = {
  "moon": {range: 192000, day_time: 96000},
  "mars": {range: 24000}, 
  "venus": {range: 720000}
}

//set or destroy the solar panel blocks
export function setSolarPanelBlocks(solar_panel, destroy = false){
  let {x, y, z} = solar_panel.location;
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  let dim = solar_panel.dimension;
  if(y > 253 || (!destroy && (!dim.getBlock({x: x, y: y + 1, z: z}).isAir || dim.containsBlock(new BlockVolume({x: x + 1, y: y + 2, z: z + 1}, {x: x - 1, y: y + 2, z: z - 1}), {excludeTypes: ["air"]})))) return undefined;

  system.run(() => {
    let panel_blocks = [[{x: x, y: y + 1, z: z}, "cosmos:solar_panel_1"], [{x: x, y: y + 2, z: z}], [{x: x + 1 , y: y + 2, z: z}],
    [{x: x - 1 , y: y + 2, z: z}], [{x: x , y: y + 2, z: z + 1}], [{x: x, y: y + 2, z: z - 1}],
    [{x: x + 1, y: y + 2, z: z + 1}], [{x: x - 1, y: y + 2, z: z - 1}], [{x: x - 1, y: y + 2, z: z + 1}], [{x: x + 1 , y: y + 2, z: z - 1}]];

    for(let i = 0; i <= 9;){
      let element = panel_blocks[i];
      let block = dim.getBlock(element[0]);
      let type = element[1] ?? "cosmos:solar_panel_2";
      type = destroy ? "air": type;
      let states = (type == "cosmos:solar_panel_2")? {"cosmos:panel_position": i}:
      {};
      block.setPermutation(BlockPermutation.resolve(type, states))
      i++;
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
    if (entity.isValid) {
      this.generateEnergy();
    }
  }
  generateEnergy() {
    const e = this.entity;
    const stopped = e.getDynamicProperty('stopped');
    const container = e.getComponent('minecraft:inventory').container;

    const variables = load_dynamic_object(e);
    let energy = variables.energy || 0;

    let time;
    let is_day_time;
    let solar_angle;
    let planet = Planet.getPlanetOfObject(e);
    if(planet){
      time =  world.getAbsoluteTime() % planets_time[planet.type].range;
      solar_angle = 360/planets_time[planet.type].range * time;
      is_day_time = (time <= planets_time[planet.type].day_time && (solar_angle < 180.5 || solar_angle > 359.5));
    }else{
      time = world.getTimeOfDay();
      solar_angle = 360/24000 * time;
      is_day_time = (time <= 13000 && (solar_angle < 180.5 || solar_angle > 359.5));
    }

    let target_angle = (is_day_time)? 0: 180;
    let current_angle = e.getProperty("cosmos:panel_angle") ?? 0;
    current_angle += (target_angle - current_angle)/20;

    //let angles_difference = (180 - Math.abs((current_angle + 12.5) % 180 - solar_angle))/180;
    e.setProperty("cosmos:panel_angle", current_angle);

    if(!(system.currentTick % 20) && !stopped){
      e.addEffect("invisibility", 9999, {showParticles: false});
      energy = Math.max(energy - 5, 0);
      if(!stopped){
        let solar_strength = 0;
        if(is_day_time){
          let {x, y, z} = this.block.location;
          let panel_blocks = [{x: x, z: z}, {x: x + 1, z: z}, {x: x - 1, z: z}, {x: x, z: z + 1}, {x: x, z: z - 1},
          {x: x + 1, z: z + 1}, {x: x - 1, z: z - 1}, {x: x - 1, z: z + 1}, {x: x + 1, z: z - 1}];

          panel_blocks.forEach((element) => {
            if(e.dimension.getTopmostBlock(element).location.y == (y + 2)) solar_strength += 1;
          });
        }
      }
    }
  }
}