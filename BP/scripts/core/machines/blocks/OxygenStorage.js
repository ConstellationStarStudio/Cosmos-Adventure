import { system } from "@minecraft/server";
import { get_data } from "../Machine.js";
import { load_dynamic_object, save_dynamic_object} from "../../../api/utils.js";
import { load_from_canister, input_fluid, output_fluid} from "../../matter/fluids.js";

const data = {
	o2: {input: "right", "output": "left", capacity: 60000, maxInput: 16},
	onTick(entity, block){
		const container = entity.getComponent('minecraft:inventory').container;
		const store_data = get_data(entity)
		const canister = container.getItem(0)
		const variables = load_dynamic_object(entity, "machine_data");
		let o2 = variables.o2 || 0;

		o2 = input_fluid({type: "o2", slot: "o2", liquid_type: "g"}, entity, block, o2)[0];
		o2 = output_fluid({type: "o2", slot: "o2", liquid_type: "g"}, entity, block, o2);

		if (!(system.currentTick % 20) && canister) { // input from canister
			if (canister.typeId == "cosmos:o2_canister") o2 = load_from_canister({
				canister, amount: o2,
				capacity: data.o2.capacity,
				container, slot: 0,
				ratio: 5 / 54,
				rate: data.o2.maxInput * 10 // multiplied by 10 because it runs every 20 ticks and the java version runs at half the speed
			})
			// handle creative canister
			if (canister.typeId == 'cosmos:creative_canister' && canister.getDynamicProperty('fluid') == 'o2') o2 = load_from_canister({
				creative: true,
				amount: o2, capacity: data.o2.capacity,
				ratio: 5 / 54,
				rate: data.o2.maxInput * 10
			})
		} 

		const text_offset = (o2 < 100)? "   ": "";
		save_dynamic_object(entity, {o2}, "machine_data");
		container.add_ui_display(1, text_offset + `§r${o2} of\n  ${store_data.o2.capacity}`)
		container.add_ui_display(2, '', Math.ceil((o2 / store_data.o2.capacity) * 75 ))
	}
}; export default data