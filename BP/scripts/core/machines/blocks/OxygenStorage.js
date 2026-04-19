import { system } from "@minecraft/server";
import { get_data } from "../Machine.js";
import { load_dynamic_object, save_dynamic_object} from "../../../api/utils.js";
import { load_from_canister_gradual, input_fluid, output_fluid} from "../../matter/fluids.js";

export default function(entity, block) {
	const container = entity.getComponent('minecraft:inventory').container;
	const store_data = get_data(entity)
	const variables = load_dynamic_object(entity, "machine_data");
	let o2 = variables.o2 || 0;

	o2 = input_fluid({type: "o2", slot: "o2"}, entity, block, o2);
	o2 = output_fluid({type: "o2", slot: "o2"}, entity, block, o2);
	if(!(system.currentTick % 10)) o2 = load_from_canister_gradual(o2, "o2", entity, 0);

	save_dynamic_object(entity, {o2}, "machine_data");
	container.add_ui_display(1, `§r ${o2} mB\nof ${store_data.o2.capacity} mB`)
	container.add_ui_display(2, '', Math.ceil((o2 / store_data.o2.capacity) * 75 ))
}