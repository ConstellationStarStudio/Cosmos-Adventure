import { system, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { load_dynamic_object, save_dynamic_object, compare_lists, closeContainerUI } from "../../../api/utils.js";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";

// Global address registry: address (int) -> { entityId, location, dimensionId, enabled }
const telepad_registry = new Map();

const MAX_TELEPORT_TIME = 150;
const TELEPORTER_RANGE = 256;
const ENERGY_USE_ON_TELEPORT = 2500;

function registry_add(address, entity, block, enabled) {
	if (address < 0) return;
	telepad_registry.set(address, {
		entityId: entity.id,
		location: { x: block.location.x, y: block.location.y, z: block.location.z },
		dimensionId: entity.dimension.id,
		enabled,
	});
}

function validate_target(address, srcDimensionId, srcLocation) {
	if (address < 0) return "NOT_FOUND";
	const entry = telepad_registry.get(address);
	if (!entry) return "NOT_FOUND";
	if (entry.dimensionId !== srcDimensionId) return "WRONG_DIM";
	const dx = entry.location.x - srcLocation.x;
	const dy = entry.location.y - srcLocation.y;
	const dz = entry.location.z - srcLocation.z;
	if (Math.sqrt(dx * dx + dy * dy + dz * dz) > TELEPORTER_RANGE) return "TOO_FAR";
	if (!entry.enabled) return "TARGET_DISABLED";
	return "VALID";
}

function receiving_status(addressValid, energy, stopped) {
	if (!addressValid) return "§cInvalid Address";
	if (energy <= 0) return "§cNo Energy";
	if (energy < ENERGY_USE_ON_TELEPORT) return "§cNot Enough Energy";
	if (stopped) return "§6Disabled";
	return "§aReceiving Active";
}

function sending_status(targetResult, energy, stopped) {
	if (targetResult === "NOT_FOUND") return "§cTarget Not Found";
	if (targetResult === "TOO_FAR") return `§cToo Far (max ${TELEPORTER_RANGE}m)`;
	if (targetResult === "WRONG_DIM") return "§cWrong Dimension";
	if (targetResult === "TARGET_DISABLED") return "§6Target Disabled";
	if (energy <= 0) return "§cNo Energy";
	if (energy < ENERGY_USE_ON_TELEPORT) return "§cNot Enough Energy";
	if (stopped) return "§6Disabled";
	return "§aSending Active";
}

// Show a text input form to set an address (retries until player is free)
function showAddressForm(player, entity, title, currentValue, propertyName) {
	let attempts = 0;
	const tryShow = () => {
		if (attempts++ > 12 || !player.isValid) return;
		const form = new ModalFormData()
			.title(title)
			.textField("Enter address (0-999999):", "0", { defaultValue: currentValue >= 0 ? String(currentValue) : "" });

		form.show(player).then(response => {
			if (response.canceled && response.cancelationReason === "UserBusy") {
				system.runTimeout(tryShow, 5);
				return;
			}
			if (response.canceled) return;
			const parsed = parseInt(response.formValues[0]);
			if (isNaN(parsed) || parsed < 0 || parsed > 999999) return;
			entity.setDynamicProperty(propertyName, parsed);
		});
	};
	tryShow();
}

// Find the player interacting with a machine entity
function findInteractingPlayer(entity) {
	const loc = entity.location;
	return entity.dimension.getPlayers({
		location: { x: loc.x, y: loc.y, z: loc.z },
		maxDistance: 6,
	})[0];
}

const data = {
	energy: { input: "below", capacity: 100000, maxInput: 2500 },
	items: {
		top_input: [0],
		side_input: [0],
	},
	onTick(entity, block) {
		const container = entity.getComponent("minecraft:inventory").container;
		const variables = load_dynamic_object(entity, "machine_data");

		let stopped = entity.getDynamicProperty("stopped");
		if (stopped == undefined) stopped = true;

		let energy = variables.energy || 0;
		let address = variables.address ?? -1;
		let targetAddress = variables.targetAddress ?? -1;
		let teleportTime = variables.teleportTime || 0;

		let first_values = [energy, address, targetAddress, teleportTime, stopped];

		// Pick up address changes from form submissions
		const newAddress = entity.getDynamicProperty("telepad_address");
		const newTarget = entity.getDynamicProperty("telepad_target");
		if (newAddress != null) {
			address = newAddress;
			entity.setDynamicProperty("telepad_address", undefined);
		}
		if (newTarget != null) {
			targetAddress = newTarget;
			entity.setDynamicProperty("telepad_target", undefined);
		}

		let ui_initialized = entity.getDynamicProperty("ui_initialized");
		if (!ui_initialized) {
			entity.setDynamicProperty("ui_initialized", true);
		} else {
			// Detect textbox clicks (slot empty = player took the button item)
			if (!container.getItem(2)) {
				container.add_ui_button(2, address >= 0 ? String(address) : "--");
				const player = findInteractingPlayer(entity);
				if (player) {
					closeContainerUI(player);
					system.run(() => {
						showAddressForm(player, entity, "Set Address", address, "telepad_address");
					});
				}
			}
			if (!container.getItem(3)) {
				container.add_ui_button(3, targetAddress >= 0 ? String(targetAddress) : "--");
				const player = findInteractingPlayer(entity);
				if (player) {
					closeContainerUI(player);
					system.run(() => {
						showAddressForm(player, entity, "Set Target Address", targetAddress, "telepad_target");
					});
				}
			}
		}

		energy = charge_from_machine(entity, block, energy);
		energy = charge_from_battery(entity, energy, 0);
		energy = Math.min(energy, data.energy.capacity);

		let addressValid = false;
		let targetResult = "NOT_FOUND";

		// Re-validate addresses every 40 ticks
		if (!(system.currentTick % 40) && block) {
			registry_add(address, entity, block, !stopped);
		}

		// Validate addresses
		if (address >= 0) {
			const entry = telepad_registry.get(address);
			addressValid = entry != null && entry.entityId === entity.id;
		}
		targetResult = validate_target(targetAddress, entity.dimension.id, block?.location ?? entity.location);

		// Teleport logic
		if (!stopped && targetResult === "VALID" && block && !(system.currentTick % 5)) {
			const loc = block.location;
			let nearby;
			try {
				nearby = entity.dimension.getEntities({
					location: { x: loc.x + 0.5, y: loc.y + 1, z: loc.z + 0.5 },
					maxDistance: 1.2,
					excludeTypes: ["minecraft:item"],
				}).filter(e => e.id !== entity.id);
			} catch (_) { nearby = []; }

			if (nearby.length > 0 && energy >= ENERGY_USE_ON_TELEPORT) {
				teleportTime++;
			} else {
				teleportTime = Math.max(teleportTime - 1, 0);
			}
		} else if (stopped || targetResult !== "VALID") {
			teleportTime = Math.max(teleportTime - 1, 0);
		}

		// Execute teleport
		if (teleportTime >= MAX_TELEPORT_TIME && block) {
			const targetEntry = telepad_registry.get(targetAddress);
			if (targetEntry) {
				const loc = block.location;
				let nearby;
				try {
					nearby = entity.dimension.getEntities({
						location: { x: loc.x + 0.5, y: loc.y + 1, z: loc.z + 0.5 },
						maxDistance: 1.2,
						excludeTypes: ["minecraft:item"],
					}).filter(e => e.id !== entity.id);
				} catch (_) { nearby = []; }

				const destLoc = targetEntry.location;
				for (const e of nearby) {
					try {
						e.teleport(
							{ x: destLoc.x + 0.5, y: destLoc.y + 0.08, z: destLoc.z + 0.5 },
							{ dimension: entity.dimension }
						);
					} catch (_) {}
				}

				if (nearby.length > 0) {
					energy = Math.max(0, energy - ENERGY_USE_ON_TELEPORT);
				}
			}
			teleportTime = 0;
		}

		save_dynamic_object(entity, { energy, address, targetAddress, teleportTime }, "machine_data");

		// UI updates
		if (!compare_lists(first_values, [energy, address, targetAddress, teleportTime, stopped]) || !container.getItem(1)) {
			container.add_ui_button(1, stopped ? "Enable" : "Disable", entity, "stopped", !stopped);
			container.setItem(2, undefined);
			container.setItem(3, undefined);
			container.add_ui_button(2, address >= 0 ? String(address) : "--");
			container.add_ui_button(3, targetAddress >= 0 ? String(targetAddress) : "--");
			container.add_ui_display(4, "Energy", Math.round((energy / data.energy.capacity) * 55) || 0);
			container.add_ui_display(5, "§r" + receiving_status(addressValid, energy, stopped), 0);
			container.add_ui_display(6, "§r" + sending_status(targetResult, energy, stopped), 0);
		}
	}
};

export default data;
