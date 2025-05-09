import { system, world, BlockVolume, ItemStack} from "@minecraft/server";
import { get_data } from "../../../api/utils";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity";

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
        if (entity.isValid()) this.collect_oxygen();
    }

    onPlace() {
        const data = get_data(this.entity);
        const container = this.entity.getComponent('minecraft:inventory').container
        const counter = new ItemStack('cosmos:ui');

        counter.nameTag = `cosmos:§energy${Math.round((0 / data.capacity) * 55)}`
        container.setItem(1, counter);
        counter.nameTag = `Energy Storage\n§aEnergy: ${0} gJ\n§cMax Energy: ${data.capacity} gJ`
        container.setItem(2, counter);

        counter.nameTag = `cosmos:§oxygen${Math.round((0 / data.o2_capacity) * 55)}`
        container.setItem(3, counter)
        counter.nameTag = `Oxygen Storage\n§aOxygen: ${0}/${data.o2_capacity}`
        container.setItem(4, counter)

        counter.nameTag = `cosmos:  Status: ${0}\n Collecting: ${0}/s`
        container.setItem(5, counter)

        counter.nameTag = 'isntactive';
        container.setItem(6, counter);

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

        let energy = this.entity.getDynamicProperty("cosmos_energy") || 0;
        let oxygen = this.entity.getDynamicProperty("cosmos_oxygen") || 0;
        let oxygen_source_bloks = this.entity.getDynamicProperty("cosmos_oxygen_source") || 0;
        
        const first_energy = energy;
        const first_oxygen = oxygen;

        if(!(system.currentTick % 10) && energy > 200){
            let number_of_leaves = (dimension == "minecraft:the_end")? 
            this.entity.getDynamicProperty("cosmos_oxygen_source"):
            93; 
            number_of_leaves = (number_of_leaves)? number_of_leaves:
            0;
            oxygen += Math.floor((0.75 * number_of_leaves));
            oxygen = Math.min(oxygen, 6000)
        }
        // Energy management
        energy = charge_from_machine(this.entity, this.block, energy);
        energy = charge_from_battery(this.entity, energy, 0);
        energy = Math.max(0, energy - 10);

        const status =
		energy == 0 ? "§4No Power" :
        oxygen_source_bloks < 2 ? "Not Enough Leaf Blocks":
		"Active";

        const counter = new ItemStack('cosmos:ui');
        if(energy !== first_energy){
            this.entity.setDynamicProperty("cosmos_energy", energy)
            counter.nameTag = `cosmos:§energy${Math.round((energy / data.capacity) * 55)}`
			container.setItem(1, counter)
			counter.nameTag = `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.capacity} gJ`
			container.setItem(2, counter)
            if(energy > 0){
                counter.nameTag = 'is_powered';
			    container.setItem(6, counter);
            }else{
                counter.nameTag = 'isntactive';
			    container.setItem(6, counter);
            }
        }
        if(oxygen !== first_oxygen){
            counter.nameTag = `cosmos:§oxygen${Math.round((oxygen / data.o2_capacity) * 55)}`
			container.setItem(3, counter)
			counter.nameTag = `Oxygen Storage\n§aOxygen: ${oxygen}/${data.o2_capacity}`
			container.setItem(4, counter)
            this.entity.setDynamicProperty("cosmos_oxygen", oxygen)
        }
        counter.nameTag = `cosmos:  Status: ${status}\n Collecting: ${oxygen_source_bloks}/s`
        //\n Collecting: ${oxygen_source_bloks}/s
        container.setItem(5, counter)
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