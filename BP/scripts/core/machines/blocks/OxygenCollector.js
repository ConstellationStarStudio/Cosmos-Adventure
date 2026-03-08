import { system, BlockVolume} from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { output_fluid } from "../../matter/fluids";

const valid_oxygen_blocks = ["minecraft:oak_leaves",
    "minecraft:spruce_leaves",
    "minecraft:birch_leaves",
    "minecraft:jungle_leaves", 
    "minecraft:acacia_leaves", 
    "minecraft:dark_oak_leaves",
    "minecraft:wheat",
    "minecraft:potatoes",
    "minecraft:carrots",
    "minecraft:beetroot",
    "minecraft:reeds"
]
export default class {
    constructor(entity, block) {
        this.entity = entity;
        this.block = block;
        if (entity.isValid) this.collect_oxygen();
    }

    collect_oxygen() {
        const dimension_id = this.entity.dimension.id;
        const data = get_data(this.entity);
        const container = this.entity.getComponent('minecraft:inventory').container;
        const variables = load_dynamic_object(this.entity, "machine_data");

        let energy = variables.energy || 0;
        let o2 = variables.o2 || 0;
        let oxygen_source_bloks = variables.oxygen_source_bloks || 0;
        oxygen_source_bloks = (dimension_id == "minecraft:overworld" && energy > 0)? 93:
        (energy > 0)? oxygen_source_bloks:
        0;

        o2 = output_fluid("o2", this.entity, this.block, o2);
        //checks for leaves or cropes approximately once every 40 ticks
        if(Math.floor(Math.random() * 10) === 0 && dimension_id == "minecraft:the_end" && energy > 200){
            oxygen_source_bloks = 0;
            let {x, y, z} = this.entity.location;
            for(let location of this.block.dimension.getBlocks(
                new BlockVolume({x: x + 5, y: y + 5, z: z + 5}, {x: x - 5, y: y - 5, z: z - 5}),
                { includeTypes: valid_oxygen_blocks }
            ).getBlockLocationIterator()){ 
                oxygen_source_bloks++ 
            } 
        }
        
        if(!(system.currentTick % 10) && energy > 200){
            o2 += Math.floor((0.75 * oxygen_source_bloks));
            o2 = Math.min(o2, 6000)
        }

        // Energy management
        energy = charge_from_machine(this.entity, this.block, energy);
        energy = charge_from_battery(this.entity, energy, 0);
        energy = Math.max(0, energy - 10);

        const status = energy == 0 ? "§4Not Enough Power" :
        (oxygen_source_bloks < 2 && dimension_id !== "minecraft:overworld")? "§4Not Enough Leaf Blocks":
		"§2Active";
        
        save_dynamic_object(this.entity, {energy, o2, oxygen_source_bloks}, "machine_data");

        const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
        const oxygen_hover = `Oxygen Storage\n§aOxygen: ${o2}/${data["o2"].capacity}`;
        
		container.add_ui_display(1, energy_hover, Math.round((energy / data.energy.capacity) * 55))
        container.add_ui_display(2, oxygen_hover, Math.round((o2 / data["o2"].capacity) * 55))
        container.add_ui_display(3, '§rStatus: ' + status)
        container.add_ui_display(4, `§rCollecting: §r${oxygen_source_bloks}/s`)
    }
}