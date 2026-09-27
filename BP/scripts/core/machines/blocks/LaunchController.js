import { system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { load_dynamic_object, save_dynamic_object, closeContainerUI } from "../../../api/utils.js";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import AllMachines from "../AllMachineBlocks.js";

// Find the player interacting with a machine entity
function findInteractingPlayer(entity) {
	const loc = entity.location;
	return entity.dimension.getPlayers({
		location: { x: loc.x, y: loc.y, z: loc.z },
		maxDistance: 6,
	})[0];
}

// Show a text input form to set a number (retries until player is free)
function showNumberForm(player, entity, title, currentValue, propertyName) {
	let attempts = 0;
	const tryShow = () => {
		if (attempts++ > 12 || !player.isValid) return;
		const form = new ModalFormData()
			.title(title)
			.textField("Enter frequency:", "0", { defaultValue: String(currentValue) });

		form.show(player).then(response => {
			if (response.canceled && response.cancelationReason === "UserBusy") {
				system.runTimeout(tryShow, 5);
				return;
			}
			if (response.canceled) return;
			const parsed = parseInt(response.formValues[0]);
			if (isNaN(parsed) || parsed < 0) return;
			entity.setDynamicProperty(propertyName, parsed);
		});
	};
	tryShow();
}

const LAUNCH_CONDITIONS = [
    "Cargo is Unloaded",
    "Cargo is Full",
    "Fully Fueled",
    "Instantly",
    "Time Elapsed: 10s",
    "Time Elapsed: 30s",
    "Time Elapsed: 1m",
    "Redstone Signal"
];

function showDropdownForm(player, entity, title, options, currentValueIndex, propertyName) {
	let attempts = 0;
	const tryShow = () => {
		if (attempts++ > 12 || !player.isValid) return;
		const form = new ModalFormData()
			.title(title)
			.dropdown("Select condition:", options, { defaultValueIndex: currentValueIndex != null ? currentValueIndex : 0 });

		form.show(player).then(response => {
			if (response.canceled && response.cancelationReason === "UserBusy") {
				system.runTimeout(tryShow, 5);
				return;
			}
			if (response.canceled) return;
			entity.setDynamicProperty(propertyName, response.formValues[0]);
		});
	};
	tryShow();
}

export class MachineBlock {}

export class LaunchController extends MachineBlock {
    static energy = {input: "below", capacity: 100000, maxInput: 2500};
    
    static onTick(entity, block) {
        const container = entity.getComponent('minecraft:inventory').container;
        const variables = load_dynamic_object(entity, "machine_data");

        let energy = variables.energy || 0;
        let frequency = variables.frequency || 0;
        let destFrequency = variables.destFrequency || 0;
        let enabled = variables.enabled || false;
        let hideDest = variables.hideDest || false;
        
        let removePad = variables.removePad || false;
        let launchWhen = variables.launchWhen || false;
        let launchCondition = variables.launchCondition || 0;

        let capacity = LaunchController.energy.capacity;

        // Sync properties from forms
        const newFreq = entity.getDynamicProperty("lc_freq");
        if (newFreq != null) { frequency = newFreq; entity.setDynamicProperty("lc_freq", undefined); }
        const newDestFreq = entity.getDynamicProperty("lc_dest_freq");
        if (newDestFreq != null) { destFrequency = newDestFreq; entity.setDynamicProperty("lc_dest_freq", undefined); }
        const newCondition = entity.getDynamicProperty("lc_cond");
        if (newCondition != null) { launchCondition = newCondition; entity.setDynamicProperty("lc_cond", undefined); }

        const isAdvanced = entity.nameTag === AllMachines.advanced_launch_controller.ui;

        let ui_initialized = entity.getDynamicProperty("ui_initialized");
        if (!ui_initialized) {
            entity.setDynamicProperty("ui_initialized", true);
        } else {
            if (isAdvanced) {
                if (container.was_ui_clicked(2, entity)) {
                    removePad = !removePad;
                    container.add_ui_display(2, "Remove Pad", removePad ? 1 : 0);
                }
                if (container.was_ui_clicked(3, entity)) {
                    launchWhen = !launchWhen;
                    container.add_ui_display(3, "Launch when", launchWhen ? 1 : 0);
                }
                if (container.was_ui_clicked(4, entity)) {
                    container.add_ui_display(4, LAUNCH_CONDITIONS[launchCondition], 0);
                    const player = findInteractingPlayer(entity);
                    if (player) {
                        closeContainerUI(player);
                        system.run(() => showDropdownForm(player, entity, "Launch Condition", LAUNCH_CONDITIONS, launchCondition, "lc_cond"));
                    }
                }
                if (container.was_ui_clicked(5, entity)) { // Back button
                    entity.nameTag = AllMachines.launch_controller.ui;
                    container.add_ui_display(5, "<", 0);
                    const player = findInteractingPlayer(entity);
                    if (player) {
                        closeContainerUI(player);
                    }
                }
            } else {
                if (container.was_ui_clicked(2, entity)) {
                    enabled = !enabled;
                    container.add_ui_display(2, enabled ? "Disable" : "Enable", 0);
                }
                if (container.was_ui_clicked(3, entity)) {
                    container.add_ui_display(3, String(frequency || 0), 0);
                    const player = findInteractingPlayer(entity);
                    if (player) {
                        closeContainerUI(player);
                        system.run(() => showNumberForm(player, entity, "Set Frequency", frequency, "lc_freq"));
                    }
                }
                if (container.was_ui_clicked(4, entity)) {
                    container.add_ui_display(4, String(destFrequency || 0), 0);
                    const player = findInteractingPlayer(entity);
                    if (player) {
                        closeContainerUI(player);
                        system.run(() => showNumberForm(player, entity, "Set Destination Frequency", destFrequency, "lc_dest_freq"));
                    }
                }
                if (container.was_ui_clicked(5, entity)) { // Hide Dest button
                    hideDest = !hideDest;
                    container.add_ui_display(5, hideDest ? "Unhide Dest" : "Hide Dest", 0);
                }
                if (container.was_ui_clicked(6, entity)) { // Advanced button
                    container.add_ui_display(6, "Advanced...", 0);
                    entity.nameTag = AllMachines.advanced_launch_controller.ui;
                    const player = findInteractingPlayer(entity);
                    if (player) {
                        closeContainerUI(player);
                    }
                }
            }
        }

        energy = charge_from_machine(entity, block, energy);
        energy = charge_from_battery(entity, energy, 0);

        // Check if anything changed
        const newEnabled = enabled;
        const newHideDest = hideDest;
        const newRemovePad = removePad;
        const newLaunchWhen = launchWhen;

        save_dynamic_object(entity, {
            energy: energy,
            frequency: frequency,
            destFrequency: destFrequency,
            enabled: enabled,
            hideDest: hideDest,
            removePad: removePad,
            launchWhen: launchWhen,
            launchCondition: launchCondition
        }, "machine_data");

        // Common energy bar - always update
        container.add_ui_display(1, "Energy", Math.round((energy / capacity) * 55) || 0);

        // Update displays based on mode — use add_ui_button for clickable buttons
        // so was_ui_clicked can detect when player takes them
        if (isAdvanced) {
            container.add_ui_display(2, "Remove Pad", removePad ? 1 : 0);
            container.add_ui_display(3, "Launch when", launchWhen ? 1 : 0);
            container.add_ui_button(4, LAUNCH_CONDITIONS[launchCondition]);
            container.add_ui_button(5, "<"); // Back button
        } else {
            container.add_ui_button(2, enabled ? "Disable" : "Enable");
            container.add_ui_button(3, String(frequency || 0));
            container.add_ui_button(4, String(destFrequency || 0));
            container.add_ui_button(5, hideDest ? "Unhide Dest" : "Hide Dest");
            container.add_ui_button(6, "Advanced...");
            let status = "§2Active";
            if (energy <= 0) status = "§4Not Enough Power";
            else if (enabled) status = "§6Disabled";
            container.add_ui_display(7, status, 0);
        }
    }
}

export default LaunchController;
