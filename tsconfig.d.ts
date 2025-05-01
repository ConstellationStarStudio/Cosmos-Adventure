import * as MC from '@minecraft/server';
import * as UI from '@minecraft/server-ui';


declare module "@minecraft/server" {

    interface World {
        getDynamicProperty<T extends keyof WorldPropertyMap>(componentId: T): WorldPropertyMap[T];
        getDimension<T extends keyof dimensionIds>(dimensionId: T): Dimension;
        getDims(fn?: (dim: Dimension) => any): Dimension[];
    }

    interface Dimension {
        /**
         * Stops a sound at a specified location.
         *
         * @param {string} soundName - The name of the sound to stop.
         * @param {mc.Vector3} location - The location at which to stop the sound.
         * @returns {mc.CommandResult} callback
         */
        stopSound(soundName: string, location: Vector3): CommandResult;
    }

    interface ItemStack {
        hasComponent<T extends keyof ItemComponents>(componentId: T): boolean;
        /**
         * Decrements the amount of the ItemStack by 1.
         * @returns {mc.ItemStack | undefined} The modified ItemStack or undefined if amount is 1.
         */
        decrementStack(amount?: number): ItemStack;
        /**
         * Increments the amount of the ItemStack by 1.
         * @returns {mc.ItemStack} The modified ItemStack or same ItemStack if amount is 64.
         */
        incrementStack(amount?: number): ItemStack;
    }

    interface Player {
        /**
        * seamlessly giving a player an item or ejecting it infront of the player if inventory is full
        */
        give(itemType: string, amount?: 1, data?: 0): void;

        /**
         * Bedrock equivalent of a mixin
         * If the entity is in the End, it saves the spawn location and call and custom overwrite methpd
         * Otherwise, it calls the original setSpawnPoint method.
         */
        setSpawnPoint(spawnPoint?: DimensionLocation): void;
        getSpawnPoint(dimensionId?: "the_end" | "minecraft:the_end"): DimensionLocation | undefined;
    }

    interface Entity {
        getDynamicProperty<T extends keyof EntityPropertyMap>(componentId: T): EntityPropertyMap[T];
        hasComponent<T extends keyof EntityComponents>(componentId: T): boolean;
    }

    interface InputInfo {
        getButtonState<T extends keyof typeof InputButton>(button: T): ButtonState;
    }

    interface EntityEquippableComponent {
        getEquipment<T extends keyof typeof EquipmentSlot>(slot: T): ItemStack;
        getEquipmentSlot<T extends keyof typeof EquipmentSlot>(slot: T): ContainerSlot;
        setEquipment<T extends keyof typeof EquipmentSlot>(slot: T, itemStack: ItemStack): ItemStack;
        setEquipmentSlot<T extends keyof typeof EquipmentSlot>(slot: T, itemStack: ItemStack): ContainerSlot;
    }

    interface Block {
        four_neighbors(sides: string[]): { [T: string]: Block } | {};
        six_neighbors(): { [T: string]: Block };
        getNeighbors(maxSearch: 27 | number): Block[];
        getDynamicProperty<T extends keyof BlockPropertyMap>(componentId: T): BlockPropertyMap[T];
        hasComponent<T extends keyof BlockComponents>(componentId: T): boolean;
    }

    interface Container {
        updateUI(uiConfigs: Array<UIConfig>, data: any): void;
        add_ui_button(slot: number, text?: string, lore?: string[]): void;
        add_ui_display(slot: number, text?: string, damage?: number): void;
        /**
           * Adds a progress bar to the specified slot.
           * If the slot is empty, it assigns a barrier ItemStack with nameTag "0".
           * If an item already exists, its value is set to "0".
           * @param {number} slotIndex - The index of the slot.
           * @returns {progressBar} The progress bar object.
           */
        addProgressBar(slotIndex: number): progressBar;
        /**
        * Retrieves an existing progress bar for the given slot index,
        * or creates one if it does not exist.
        * @param {number} slotIndex - The index of the slot.
        * @returns {progressBar} The progress bar object.
        */
        getOrCreateProgressBar(slotIndex: number): progressBar;


        /**
         * Sets the progress value (clamped between 0 and 9) for the progress bar
         * at the given slot, and updates the slot's value.
         * @param {number} slotIndex - The index of the slot.
         * @param {number} value - New progress value (0-9).
        */
        setProgressBar(slotIndex: number, value: number): void;
        /**
         * Retrieves an existing progress bar for the given slot index,
         * @param {number} slotIndex - The index of the slot.
         * @returns {progressBar} The progress bar object.
         */
        getProgressBar(slotIndex: number): progressBar;
    }

    interface EntityEquipmentInventoryComponent {
        getEquipmentSlot<T extends keyof typeof EquipmentSlot>(equipmentSlot: T): ContainerSlot
        getEquipment<T extends keyof typeof EquipmentSlot>(equipmentSlot: T): ItemStack
    }

}

interface progressBar {
    slotIndex: number;
    value: number;
}

interface UIConfig {
    text?: string | ((any) => string);
    lore?: string[] | ((any) => string[]);
    slot: number;
}

interface dimensionIds {
    "the_end": string,
    "nether": string,
    "overworld": string,
    "minecraft:the_end": string,
    "minecraft:nether": string,
    "minecraft:overworld": string,
}

interface BlockPropertyMap {

}
interface EntityPropertyMap {
    customSpawnPoint: MC.Vector3;
    dimension: string;
    active: boolean;
    fuel_level: number;

    isOpen: boolean;

    in_celestial_selector: boolean;
    rocket_launched: boolean;
    cosmos_burnTime: number;
    cosmos_heat: number;
    cosmos_power: number;
}
interface WorldPropertyMap {
    all_space_stations: string;
}

interface BlockComponents {
    "inventory": MC.BlockInventoryComponent,
    "minecraft:inventory": MC.BlockInventoryComponent,
    "fluidContainer": MC.BlockFluidContainerComponent,
    "minecraft:fluidContainer": MC.BlockFluidContainerComponent,
    "piston": MC.BlockPistonComponent,
    "minecraft:piston": MC.BlockPistonComponent,
    "recordPlayer": MC.BlockRecordPlayerComponent,
    "minecraft:recordPlayer": MC.BlockRecordPlayerComponent,
    "sign": MC.BlockSignComponent,
    "minecraft:sign": MC.BlockSignComponent,
}

interface EntityComponents {
    "addrider": MC.EntityAddRiderComponent,
    "minecraft:addrider": MC.EntityAddRiderComponent,
    "ageable": MC.EntityAgeableComponent,
    "minecraft:ageable": MC.EntityAgeableComponent,
    "breathable": MC.EntityBreathableComponent,
    "minecraft:breathable": MC.EntityBreathableComponent,
    "can_climb": MC.EntityCanClimbComponent,
    "minecraft:can_climb": MC.EntityCanClimbComponent,
    "can_fly": MC.EntityCanFlyComponent,
    "minecraft:can_fly": MC.EntityCanFlyComponent,
    "can_power_jump": MC.EntityCanPowerJumpComponent,
    "minecraft:can_power_jump": MC.EntityCanPowerJumpComponent,
    "color": MC.EntityColorComponent,
    "minecraft:color": MC.EntityColorComponent,
    "equippable": MC.EntityEquippableComponent,
    "minecraft:equippable": MC.EntityEquippableComponent,
    "fire_immune": MC.EntityFireImmuneComponent,
    "minecraft:fire_immune": MC.EntityFireImmuneComponent,
    "floats_in_liquid": MC.EntityFloatsInLiquidComponent,
    "minecraft:floats_in_liquid": MC.EntityFloatsInLiquidComponent,
    "flying_speed": MC.EntityFlyingSpeedComponent,
    "minecraft:flying_speed": MC.EntityFlyingSpeedComponent,
    "friction_modifier": MC.EntityFrictionModifierComponent,
    "minecraft:friction_modifier": MC.EntityFrictionModifierComponent,
    "ground_offset": MC.EntityGroundOffsetComponent,
    "minecraft:ground_offset": MC.EntityGroundOffsetComponent,
    "healable": MC.EntityHealableComponent,
    "minecraft:healable": MC.EntityHealableComponent,
    "health": MC.EntityHealthComponent,
    "minecraft:health": MC.EntityHealthComponent,
    "inventory": MC.EntityInventoryComponent,
    "minecraft:inventory": MC.EntityInventoryComponent,
    "is_baby": MC.EntityIsBabyComponent,
    "minecraft:is_baby": MC.EntityIsBabyComponent,
    "is_chested": MC.EntityIsChestedComponent,
    "minecraft:is_chested": MC.EntityIsChestedComponent,
    "is_dyeable": MC.EntityIsDyeableComponent,
    "minecraft:is_dyeable": MC.EntityIsDyeableComponent,
    "is_hidden_when_invisible": MC.EntityIsHiddenWhenInvisibleComponent,
    "minecraft:is_hidden_when_invisible": MC.EntityIsHiddenWhenInvisibleComponent,
    "is_ignited": MC.EntityIsIgnitedComponent,
    "minecraft:is_ignited": MC.EntityIsIgnitedComponent,
    "is_illager_captain": MC.EntityIsIllagerCaptainComponent,
    "minecraft:is_illager_captain": MC.EntityIsIllagerCaptainComponent,
    "is_saddled": MC.EntityIsSaddledComponent,
    "minecraft:is_saddled": MC.EntityIsSaddledComponent,
    "is_shaking": MC.EntityIsShakingComponent,
    "minecraft:is_shaking": MC.EntityIsShakingComponent,
    "is_sheared": MC.EntityIsShearedComponent,
    "minecraft:is_sheared": MC.EntityIsShearedComponent,
    "is_stackable": MC.EntityIsStackableComponent,
    "minecraft:is_stackable": MC.EntityIsStackableComponent,
    "is_stunned": MC.EntityIsStunnedComponent,
    "minecraft:is_stunned": MC.EntityIsStunnedComponent,
    "is_tamed": MC.EntityIsTamedComponent,
    "minecraft:is_tamed": MC.EntityIsTamedComponent,
    "item": MC.EntityItemComponent,
    "minecraft:item": MC.EntityItemComponent,
    "lava_movement": MC.EntityLavaMovementComponent,
    "minecraft:lava_movement": MC.EntityLavaMovementComponent,
    "leashable": MC.EntityLeashableComponent,
    "minecraft:leashable": MC.EntityLeashableComponent,
    "mark_variant": MC.EntityMarkVariantComponent,
    "minecraft:mark_variant": MC.EntityMarkVariantComponent,
    "tamemount": MC.EntityTameMountComponent,
    "minecraft:tamemount": MC.EntityTameMountComponent,
    "movement.amphibious": MC.EntityMovementAmphibiousComponent,
    "minecraft:movement.amphibious": MC.EntityMovementAmphibiousComponent,
    "movement.basic": MC.EntityMovementBasicComponent,
    "minecraft:movement.basic": MC.EntityMovementBasicComponent,
    "movement": MC.EntityMovementComponent,
    "minecraft:movement": MC.EntityMovementComponent,
    "movement.fly": MC.EntityMovementFlyComponent,
    "minecraft:movement.fly": MC.EntityMovementFlyComponent,
    "movement.generic": MC.EntityMovementGenericComponent,
    "minecraft:movement.generic": MC.EntityMovementGenericComponent,
    "movement.glide": MC.EntityMovementGlideComponent,
    "minecraft:movement.glide": MC.EntityMovementGlideComponent,
    "movement.hover": MC.EntityMovementHoverComponent,
    "minecraft:movement.hover": MC.EntityMovementHoverComponent,
    "movement.jump": MC.EntityMovementJumpComponent,
    "minecraft:movement.jump": MC.EntityMovementJumpComponent,
    "movement.skip": MC.EntityMovementSkipComponent,
    "minecraft:movement.skip": MC.EntityMovementSkipComponent,
    "movement.sway": MC.EntityMovementSwayComponent,
    "minecraft:movement.sway": MC.EntityMovementSwayComponent,
    "navigation.climb": MC.EntityNavigationClimbComponent,
    "minecraft:navigation.climb": MC.EntityNavigationClimbComponent,
    "navigation.float": MC.EntityNavigationFloatComponent,
    "minecraft:navigation.float": MC.EntityNavigationFloatComponent,
    "navigation.fly": MC.EntityNavigationFlyComponent,
    "minecraft:navigation.fly": MC.EntityNavigationFlyComponent,
    "navigation.generic": MC.EntityNavigationGenericComponent,
    "minecraft:navigation.generic": MC.EntityNavigationGenericComponent,
    "navigation.hover": MC.EntityNavigationHoverComponent,
    "minecraft:navigation.hover": MC.EntityNavigationHoverComponent,
    "navigation.walk": MC.EntityNavigationWalkComponent,
    "minecraft:navigation.walk": MC.EntityNavigationWalkComponent,
    "onfire": MC.EntityOnFireComponent,
    "minecraft:onfire": MC.EntityOnFireComponent,
    "push_through": MC.EntityPushThroughComponent,
    "minecraft:push_through": MC.EntityPushThroughComponent,
    "rideable": MC.EntityRideableComponent,
    "minecraft:rideable": MC.EntityRideableComponent,
    "riding": MC.EntityRidingComponent,
    "minecraft:riding": MC.EntityRidingComponent,
    "scale": MC.EntityScaleComponent,
    "minecraft:scale": MC.EntityScaleComponent,
    "skin_id": MC.EntitySkinIdComponent,
    "minecraft:skin_id": MC.EntitySkinIdComponent,
    "strength": MC.EntityStrengthComponent,
    "minecraft:strength": MC.EntityStrengthComponent,
    "tameable": MC.EntityTameableComponent,
    "minecraft:tameable": MC.EntityTameableComponent,
    "underwater_movement": MC.EntityUnderwaterMovementComponent,
    "minecraft:underwater_movement": MC.EntityUnderwaterMovementComponent,
    "variant": MC.EntityVariantComponent,
    "minecraft:variant": MC.EntityVariantComponent,
    "wants_jockey": MC.EntityWantsJockeyComponent,
    "minecraft:wants_jockey": MC.EntityWantsJockeyComponent
}

interface ItemComponents {
    "cooldown": MC.ItemCooldownComponent,
    "minecraft:cooldown": MC.ItemCooldownComponent,
    "durability": MC.ItemDurabilityComponent,
    "minecraft:durability": MC.ItemDurabilityComponent,
    "enchantable": MC.ItemEnchantableComponent,
    "minecraft:enchantable": MC.ItemEnchantableComponent,
    "food": MC.ItemFoodComponent,
    "minecraft:food": MC.ItemFoodComponent,
}