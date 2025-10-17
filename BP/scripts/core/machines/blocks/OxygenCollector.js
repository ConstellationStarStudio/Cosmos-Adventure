import { system, world, BlockVolume, ItemStack} from "@minecraft/server";
import { get_data } from "../Machine";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils"
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";
import { output_fluid } from "../../matter/fluids";

let valid_oxygen_blocks = ["minecraft:oak_leaves",
    "minecraft:spruce_leaves",
    "minecraft:birch_leaves",
    "minecraft:jungle_leaves", 
    "minecraft:acacia_leaves", 
    "minecraft:dark_oak_leaves"
]
export default class {
    constructor(entity, block) {
        this.entity = entity;
        this.block = block;
        if (entity.isValid) this.collect_oxygen();
    }

    onPlace() {
        if(this.block.dimension.id == "minecraft:the_end"){
            let {x, y, z} = this.block.location;
            let block_number = 0;
            for(let location of this.block.dimension.getBlocks(
                new BlockVolume({x: x + 5, y: y + 5, z: z + 5}, {x: x - 5, y: y - 5, z: z - 5}),
                { includeTypes: valid_oxygen_blocks }
            ).getBlockLocationIterator()){ block_number++ } 
            this.entity.setDynamicProperty("cosmos_oxygen_source", block_number);
        }
    }

    collect_oxygen() {
        let dimension = this.entity.dimension.id;
        const data = get_data(this.entity);
        const container = this.entity.getComponent('minecraft:inventory').container;
        const variables = load_dynamic_object(this.entity);

        let energy = variables.energy || 0;
        let o2 = variables.o2 || 0;
        let oxygen_source_bloks = this.entity.getDynamicProperty("cosmos_oxygen_source") || 0;
        oxygen_source_bloks = (dimension == "minecraft:overworld" && energy > 0)? 93:
        (energy > 0)? oxygen_source_bloks:
        0;
        const first_energy = energy;
        const first_oxygen = o2;

        o2 = output_fluid("o2", this.entity, this.block, o2);

        if(!(system.currentTick % 10) && energy > 200){
            let number_of_leaves = (dimension == "minecraft:the_end")? 
            this.entity.getDynamicProperty("cosmos_oxygen_source"):
            93; 
            number_of_leaves = (number_of_leaves)? number_of_leaves:
            0;
            o2 += Math.floor((0.75 * number_of_leaves));
            o2 = Math.min(o2, 6000)
        }
        // Energy management
        energy = charge_from_machine(this.entity, this.block, energy);
        energy = charge_from_battery(this.entity, energy, 0);
        energy = Math.max(0, energy - 10);

        const status = energy == 0 ? "§4Not Enough Power" :
        (oxygen_source_bloks < 2 && dimension !== "minecraft:overworld")? "§4Not Enough Leaf Blocks":
		"§2Active";
        
        save_dynamic_object(this.entity, {energy, o2});

        const energy_hover = `Energy Storage\n§aEnergy: ${Math.round(energy)} gJ\n§cMax Energy: ${data.energy.capacity} gJ`;
        const oxygen_hover = `Oxygen Storage\n§aOxygen: ${o2}/${data["o2"].capacity}`;
        
		container.add_ui_display(1, energy_hover, Math.round((energy / data.energy.capacity) * 55))
        container.add_ui_display(2, oxygen_hover, Math.round((o2 / data["o2"].capacity) * 55))
        container.add_ui_display(3, '§rStatus: ' + status)
        container.add_ui_display(4, `§rCollecting: §r${oxygen_source_bloks}/s`)
    }
}

world.afterEvents.playerPlaceBlock.subscribe((data) => {
    if(data.block.dimension.id == "minecraft:the_end" && /minecraft:.+_leaves/.test(data.block.typeId)){
        find_oxygen(data.block, false)
    }
});
world.afterEvents.playerBreakBlock.subscribe((data) => {
    if(data.block.dimension.id == "minecraft:the_end" && /minecraft:.+_leaves/.test(data.brokenBlockPermutation.type.id)){
        find_oxygen(data.block, true)
    }
});

function find_oxygen(block, must_delete){
    let collectors = block.dimension.getEntities({location: block.location, maxDistance: 5, type: "cosmos:oxygen_collector"});
    collectors.forEach(collector => {
        let leaves = collector.getDynamicProperty("cosmos_oxygen_source");
        let number_of_leaves = 0;
        if(must_delete){
            number_of_leaves = (!leaves)? 0:
            leaves - 1;
        }else{
            number_of_leaves = (!leaves)? 1:
            leaves + 1;
        }
        collector.setDynamicProperty("cosmos_oxygen_source", number_of_leaves);
    });
}