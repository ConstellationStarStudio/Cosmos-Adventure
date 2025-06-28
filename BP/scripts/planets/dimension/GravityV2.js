import { world, system, Entity } from "@minecraft/server";
import { Planet  } from "./GalacticraftPlanets";
export { Gravity };


/**
 * ✨💕 LUM STUDIO GRAVITY SYSTEM (2022-2025) 💕✨
 * Custom Gravitational Computational Engine for Minecraft Bedrock
 * Created with love and passion by LUM STUDIO. @ARR
* @author SERTY 
* @author REFRACTED
 */


// --- Shared State using WeakMaps ---
/** @type {WeakMap<any, boolean>} */
const playerJumpMap = new WeakMap();
/** @type {WeakMap<any, number>} */
const jumpStartY = new WeakMap();
/** @type {WeakMap<any, number>} */
const pendingJumpSteps = new WeakMap();
/** @type {WeakMap<any, number>} */
const fallVelocity = new WeakMap();


/**
 * Class representing a custom gravity system for an entity.
 */
class Gravity {
  /**@type {WeakMap<Entity, Gravity>} */
  static #log = new WeakMap();
  static of(entity) {
    return this.#log.get(entity) ?? this.#log.set(entity, new Gravity(entity)).get(entity)
  }
  /**
   * Creates a Gravity instance.
   * @param {Entity} entity - The Minecraft entity.
   */
  constructor(entity) {
    this._entity = entity;
  }

  /**
   * Gets the underlying entity.
   * @return {any} The entity.
   */
  get entity() {
    return this._entity;
  }

  /**
   * Retrieves the current gravity value.
   * Checks for a temporary override or dynamic property; defaults to 9.8.
   * @return {number} The gravity value.
   */
  get value() {
    const e = this.entity
    return e?.tempGravityValue ?? e?.getDynamicProperty?.("sert:gravity") ?? 9.8
  }

  /**
   * Validates a gravity value.
   * @param {number} value - The gravity value.
   * @return {boolean} True if valid.
   */
  canSet(value) {
    return typeof value === "number" && value > 0 && !isNaN(value) && value !== Infinity;
  }

  /**
   * Sets a permanent gravity value on the entity.
   * @param {number} value - The gravity value.
   */
  set(value) {
    if (!this.canSet(value)) {
      throw new Error(
        "Failed to set gravity value(" +
        value +
        ") for " +
        this.entity.typeId +
        " (use Gravity.canSet)"
      );
    }
    if (typeof this.entity.setDynamicProperty === "function") {
      this.entity.setDynamicProperty("sert:gravity", value);
    }
  }

  /**
   * Sets a temporary gravity value on the entity.
   * @param {number} value - The temporary gravity value.
   */
  setTemp(value) {
    if (!this.canSet(value)) {
      throw new Error(
        "Failed to set gravity value(" +
        value +
        ") for " +
        this.entity.typeId +
        " (use Gravity.canSet)"
      );
    }
    this.entity.tempGravityValue = value;
  }

  /**
   * Sets the gravity "line" for jump smoothing.
   * @param {number[]} [line=[1]] - The array of impulse values.
   */
  setGravityLine(line = [1]) {
    if (!Array.isArray(this.entity.gravityLine)) {
      this.entity.gravityLine = [];
    }
    this.entity.gravityLine = line.concat(this.entity.gravityLine.slice(line.length - 1));
  }

  /**
   * Computes the gravity vector for the entity.
   * Incorporates jump smoothing and horizontal adjustments.
   * @return {Object} An object with properties x, y, z, and hzPower.
   */
  calculateGravityVector() {
    const entity = this.entity;
    const vector = { x: 0, y: -1, z: 0 };
    const power = { x: 1, y: this.value / 2, z: 1 };

    if (entity.isJumping && playerJumpMap.get(entity)) {
      playerJumpMap.set(entity, false);
      const jumpBoost =
        typeof entity.getEffect === "function" && entity.getEffect("jump_boost")
          ? Number(entity.getEffect("jump_boost").amplifier) + 1
          : 1;
      const gravityMod = Math.max(0.1, (9.8 - this.value) / 10 + 1);
      const lineLength = Math.floor(18 + (9.8 - this.value));
      const lineArray = Array.from({ length: lineLength }, (_, i) =>
        ((lineLength - i) / 6) *
        -gravityMod *
        5 *
        ((jumpBoost * 0.2 + 1)) /
        Math.max(Math.min(1, this.value), 0.005)
      );
      this.setGravityLine(lineArray);
    } else if (entity.isOnGround) {
      this.cancelPendingJumps();
      playerJumpMap.set(entity, true);
    }

    if (Array.isArray(entity.gravityLine) && entity.gravityLine.length > 0) {
      power.y += entity.gravityLine[0];
      entity.gravityLine.shift();
    }

    if (entity.inputInfo && typeof entity.inputInfo.getMovementVector === "function") {
      const movement = entity.inputInfo.getMovementVector();
      if (movement) {
        let viewDir =
          typeof entity.getViewDirection === "function"
            ? entity.getViewDirection()
            : { x: 0, y: 0, z: 0 };
        viewDir.y = 0
        viewDir = getDirection3D({x: 0, z: 0, y: 0}, viewDir)

        const rotation =
          typeof entity.getRotation === "function"
            ? entity.getRotation()
            : { x: 0, y: 0, z: 0 };
        const rotatedDir = getDirectionFromRotation(sumObjects(rotation, { x: 0, y: 90, z: 0 }));
        vector.x = Number(viewDir.x) * Number(movement.y) - Number(rotatedDir.x) * Number(movement.x);
        vector.z = Number(viewDir.z) * Number(movement.y) - Number(rotatedDir.z) * Number(movement.x);
        entity.movementDirection = {
          x: vector.x,
          z: vector.z
        }
      }
    }

    if (!canMoveUp(entity)) {
      vector.y = -0.1
      entity.gravityLine = []
    }

    return {
      x: Number(vector.x),
      y: Number(power.y * vector.y),
      z: Number(vector.z),
      hzPower: this.calculateHorizontalPower(entity)
    };
  }

  /**
   * Computes horizontal movement power based on active effects.
   * @param {Entity} entity - The entity.
   * @return {number} The horizontal power.
   */
  calculateHorizontalPower(entity) {
    const speed =
      typeof entity.getEffect === "function" && entity.getEffect("speed")
        ? Number(entity.getEffect("speed").amplifier) + 1
        : 1;
    const slowness =
      typeof entity.getEffect === "function" && entity.getEffect("slowness")
        ? Number(entity.getEffect("slowness").amplifier) + 1
        : 1;
    const base = (speed - slowness) * 0.2 + 1;
    const modifier = 0.18 + (entity.isSprinting ? 0.2 : 0) - (entity.isSneaking ? 0.1 : 0);
    return base * modifier;
  }

  /**
   * Applies knockback to a target entity, scaled by its knockback resistance.
   * @param {any} targetEntity - The target entity.
   * @param {Object} vector - The gravity vector.
   * @param {Object} power - The power object.
   */
  applyKnockbackWithResistance(targetEntity, vector, power) {
    const knockbackResistance =
      typeof targetEntity.getEffect === "function" && targetEntity.getEffect("knockback_resistance")
        ? Number(targetEntity.getEffect("knockback_resistance").amplifier)
        : 0;
    const resistanceFactor = 1 + knockbackResistance * 0.2;
    const adjustedPower = {
      x: Number(vector.x) * Number(power.hzPower) * resistanceFactor,
      z: Number(vector.z) * Number(power.hzPower) * resistanceFactor,
      y: Number(vector.y) * Number(power.y) * resistanceFactor
    };

    if (typeof targetEntity.applyKnockback === "function") {
      applyKnockback(
        targetEntity,
        Number(adjustedPower.x),
        Number(adjustedPower.z),
        Number(vector.hzPower),
        Number(adjustedPower.y)
      );
    }
  }

  /**
   * Calculates the fall distance based on the stored jump start.
   * @return {number} The fall distance.
   */
  calculateFallDistance() {
    const startY = Number(jumpStartY.get(this.entity)) || 0;
    const currentY = Number(this.entity.location && this.entity.location.y) || 0;
    return Math.max(0, startY - currentY);
  }
  cancelPendingJumps() {
    const timeoutId = pendingJumpSteps.get(this.entity);
    if (timeoutId) {
      system.clearRun(timeoutId);
      pendingJumpSteps.delete(this.entity);
    }
    // Halt the jump smoothing sequence by clearing any remaining gravityLine values.
    if (Array.isArray(this.entity.gravityLine)) {
      this.entity.gravityLine = [];
    }
    // Reset the jump flag so that a new jump can be started later.
    playerJumpMap.set(this.entity, true);
    // Activate the fall sequence by applying a downward impulse.
    // Use the entity's current gravity value to determine the impulse magnitude.
    const currentGravity = this.value;
    this.entity.applyImpulse({ x: 0, y: -currentGravity / 10, z: 0 });
    jumpStartY.set(this.entity, this.entity.location.y);
  }
  

/**
 * Processes gravity for a given entity.
 * Skips processing if the entity is swimming, flying, gliding, or (if a player) wearing an elytra.
 * Also zeroes horizontal impulses in narrow spaces.
 * @param {Entity} entity - The entity.
 */

function gravityFuncMain(entity) {
  // If swimming or (for players) flying/gliding, reset fall velocity and exit early.
  if (
    entity.isSwimming ||
    (entity.typeId === "minecraft:player" &&
      (entity.isFlying || entity.isGliding))
  ) {
    resetFallVelocity(entity);
    return;
  }

  // Create a new Gravity instance for the entity.
  const gravity = Gravity.of(entity);

  // If gravity is essentially normal (9.8) and the entity is a player,
  // remove it from gravityEntities and cancel any pending jump adjustments.
  if (entity.typeId === "minecraft:player" && Math.abs(gravity.value - 9.8) < 0.0001) {
    gravityEntities.delete(entity);
    resetFallVelocity(entity);
    gravity.cancelPendingJumps();
    return;
  }

  // Calculate the gravity vector and get the current fall velocity.
  const vector = gravity.calculateGravityVector();
  const currentFall = Number(fallVelocity.get(entity)) || 0;

  // For player entities with movement input, check for obstacles in multiple directions.
  if (
    entity.typeId === "minecraft:player" &&
    typeof entity.inputInfo?.getMovementVector === "function"
  ) {
    if (!canMoveForward(entity)) {
      // Zero out horizontal movement if obstacles are detected.
      vector.y = 0;
      vector.x = 0;
      vector.z = 0;
    }
  }

  // Determine whether to use the full gravity effects or the entity version.
  if (!entity.isOnGround && !entity.isClimbing && !entity.isSwimming) {
    if (entity.typeId === "minecraft:player") {
      // Use the gravity effect for player entities.
      applyGravityEffects(entity, vector, currentFall, gravity.value, gravity);
    } else {
      // Use the gravity effect for non-player entities.
      applyGravityEntity(entity, gravity);
    }
  } else {
    // If on the ground or climbing, reset fall velocity and cancel any pending jump adjustments.
    resetFallVelocity(entity);
    gravity.cancelPendingJumps();
  }
}



/**
 * Applies low-gravity effects for non-player entities,
 * including integrated slime bounce logic.
 *
 * In low-gravity environments, if the entity’s fall speed exceeds a terminal
 * limit, an upward impulse is applied to decelerate its descent. Additionally,
 * if the entity is above a slime block and falling fast, it bounces.
 *
 * @param {Entity} entity - The non-player entity.
 * @param {Gravity} gravity - (Optional) The Gravity instance for the entity.
 *   If undefined, a new instance is created.
 */
function applyGravityEntity(entity, gravity) {
  
  // Ensure a Gravity instance exists. (this is necessary to avoid errors DONT REMOVE THIS)
  if (!gravity || typeof gravity.calculateGravityVector !== "function") {
    gravity = Gravity.of(entity);
  }

  // Retrieve the gravity vector (primarily using its vertical component).
  const vector = gravity.calculateGravityVector();
  let currentFall = Number(fallVelocity.get(entity)) || 0;

  // --- Slime Bounce Logic ---
  // If the block below is a slime block and the entity is falling fast,
  // perform a bounce by applying an upward impulse.
  const blockBelow = getBlockBelow(entity);
  if (blockBelow && blockBelow.typeId === "minecraft:slime_block") {
    if (currentFall < -0.001) {
      const bounceFactor = 0.8; // Retain a percentage of the fall energy.
      const bounceImpulse = Math.abs(currentFall) * bounceFactor;
      fallVelocity.set(entity, bounceImpulse);
      entity.applyImpulse({ x: 0, y: bounceImpulse, z: 0 });

      // Optional: spawn bounce particles and play a sound.
      entity.dimension.spawnParticle?.("minecraft:slime_bounce", {
        x: Math.floor(entity.location.x),
        y: Math.floor(entity.location.y - 0.5),
        z: Math.floor(entity.location.z)
      });
    }
    entity.dimension.playSound?.("mob.slime.jump", entity.getHeadLocation());
    return; // Bounce takes precedence.
  }

  // --- Low-Gravity Descent Logic ---
  // Define a terminal velocity that scales with the gravity value.
  // In low gravity, the maximum (negative) fall speed is less extreme.
  const terminalVelocity = -20 * (gravity.value / 9.8);
  let impulse;

  // If falling too fast, apply an upward (counter) impulse to slow descent.
  if (currentFall < terminalVelocity) {
    const deceleration = (terminalVelocity - currentFall) / 10;
    impulse = { x: 0, y: deceleration, z: 0 };
  } else {
    // Otherwise, apply a normal downward impulse.
    const impulseMagnitude = gravity.value / 10;
    impulse = { x: 0, y: -impulseMagnitude, z: 0 };
  }

  entity.applyImpulse(impulse);

  // Update the current fall velocity.
  if (impulse.y < 0) {
    currentFall -= gravity.value / 10;
  } else {
    currentFall += impulse.y;
  }
  fallVelocity.set(entity, currentFall);

  // Update a dynamic "fall_distance" property.
  if (typeof entity.setDynamicProperty === "function") {
    const startY = Number(jumpStartY.get(entity)) || 0;
    const currentY = Number(entity.location && entity.location.y) || 0;
    const fallDist = Math.max(0, startY - currentY);
    entity.setDynamicProperty("fall_distance", fallDist);
  }
}




/**
 * Applies gravity effects to an entity.
 * Uses applyKnockback for downward pull, updates fall velocity,
 * and applies a dynamic slow falling effect.
 * @param {Entity} entity - The entity.
 * @param {Object} vector - The computed gravity vector.
 * @param {number} currentFall - The current fall velocity.
 * @param {Gravity} gravity - The Gravity instance (used for fall distance calculation).
 */
async function applyGravityEffects(entity, vector, currentFall, gravityValue, gravity) {
  // Determine acceleration factor based on block below.
  const blockBelow = getBlockBelow(entity);
  let fallAccelerationFactor;
  if (blockBelow && blockBelow.typeId === "minecraft:slime_block") {
    // If on a slime block, check if the fall velocity is below a threshold.
    const bounceThreshold = -0.001; // threshold for a hard fall
    if (currentFall < bounceThreshold) {
      // Calculate bounce impulse relative to the current fall velocity.
      const bounceFactor = 0.8; // Retain a percentage of the fall energy.
      const bounceImpulse = Math.abs(currentFall) * bounceFactor;

      // Set the new fall velocity upward.
      fallVelocity.set(entity, bounceImpulse);

      // Apply an upward impulse for the bounce.
      applyKnockback(entity, 0, 0, 0, bounceImpulse);

      // Trigger visual/audio feedback for the bounce.
      entity.dimension.spawnParticle?.("minecraft:slime_bounce", {
        x: Math.floor(entity.location.x),
        y: Math.floor(entity.location.y - 0.5),
        z: Math.floor(entity.location.z)
      });
      entity.dimension.playSound?.("mob.slime.jump", entity.getHeadLocation());

      // Exit early so the bounce is handled exclusively.
      return;
    } else {
      // If the fall velocity isn't low enough for a bounce, use gentler acceleration.
      fallAccelerationFactor = gravityValue / 12;
    }
  } else {
    // For non-slime blocks, use normal acceleration.
    fallAccelerationFactor = gravityValue / 5;
  }
  const fallModifier = Math.min(0, Number(currentFall));
  // Knockback power to push the player up and down.
  const knockbackPower = (Number(vector.y) * 3 + fallModifier) / 300;

  if (typeof entity.applyKnockback === "function") {
    applyKnockback(
      entity,
      Number(vector.x),
      Number(vector.z),
      Number(vector.hzPower),
      Number(knockbackPower)
    );
  }
  fallVelocity.set(entity, Number(currentFall) - gravityValue / 5);

  if (typeof entity.setDynamicProperty === "function") {
    const startY = Number(jumpStartY.get(entity)) || 0;
    const currentY = Number(entity.location && entity.location.y) || 0;
    const fallDist = Math.max(0, startY - currentY);
    entity.setDynamicProperty("fall_distance", fallDist);
  }

  // Dynamic slow falling based on proximity to the ground 
  const baseGravity = 9.8;
  const gravityDelta = gravityValue - baseGravity;
  const fallDistance = gravity.calculateFallDistance();
  let slowFallingAmplifier, slowFallingDuration;
  // If very close to the ground, cancel slow falling so the landing accelerates.
  if (fallDistance < 2) {
    slowFallingAmplifier = 0;
    slowFallingDuration = 1;
  } else {
    slowFallingAmplifier = gravityDelta > 0 ? Math.min(1, Math.floor(gravityDelta / 10)) : 0;
    slowFallingDuration = gravityDelta > 0 ? Math.max(1, Math.ceil(gravityDelta / 10)) : 1;
  }

  if (entity.isSneaking) {
    slowFallingAmplifier = Math.max(0, slowFallingAmplifier - 1);
    slowFallingDuration = Math.max(1, slowFallingDuration - 1);
  }

  // Check if the entity's head is blocked before waiting on the slow-falling effect.
  if (!canMoveUp(entity)) {
    gravity.cancelPendingJumps();
    return;
  }

  try {
    await delay(1, entity);
    if (entity.isValid && typeof entity.addEffect === "function") {
      entity.addEffect("slow_falling", slowFallingDuration, {
        amplifier: slowFallingAmplifier,
        showParticles: false
      });
    }
  } catch (err) {
    console.error("Error applying gravity effects:", err);
  }
}





/**
 * Resets the fall velocity for an entity.
 * @param {Entity} entity - The entity.
 */
function resetFallVelocity(entity) {
  fallVelocity.set(entity, 0);
}

/**
 * Sums two vector-like objects.
 * @param {Object} obj - The first vector.
 * @param {Object} [vec={x:0,y:0,z:0}] - The second vector.
 * @param {number} [multi=1] - A multiplier.
 * @return {Object} The summed vector.
 */
function sumObjects(obj, vec = { x: 0, y: 0, z: 0 }, multi = 1) {
  return {
    x: (Number(obj.x) || 0) + (Number(vec.x) || 0) * multi,
    y: (Number(obj.y) || 0) + (Number(vec.y) || 0) * multi,
    z: (Number(obj.z) || 0) + (Number(vec.z) || 0) * multi
  };
}

function getDirection3D(vector1, vector2) {
  let dist = distance(vector1, vector2)
  if (dist == 0) return {x: 0, z: 0, y: 0}
  return {
    x: (vector2.x - vector1.x)/dist,
    y: (vector2.y - vector1.y)/dist,
    z: (vector2.z - vector1.z)/dist
  }
}

function distance(vector1, vector2) {
  return Math.sqrt(Math.abs(vector1.x - vector2.x)**2 + Math.abs(vector1.y - vector2.y)**2 + Math.abs(vector1.z - vector2.z)**2)
}

/**
 * Converts a rotation object to a directional vector.
 * @param {Object} rotation - The rotation object.
 * @return {Object} The direction vector.
 */
function getDirectionFromRotation(rotation) {
  const radY = (Number(rotation.y) + 90) * (Math.PI / 180);
  const radX = (Number(rotation.x) + 90) * (Math.PI / 180);
  return {
    x: Math.cos(radY),
    y: Math.cos(radX),
    z: Math.sin(radY)
  };
}

/**
 * Returns a promise that resolves after a specified number of ticks.
 * @param {number} ticks - The number of ticks.
 * @return {Promise<void>} A promise that resolves after the delay.
 */
function delay(ticks, entity) {
  return new Promise(resolve => {
    const id = system.runTimeout(resolve, ticks * 10);
    pendingJumpSteps.set(entity, id);
  });
}

// Global cache for entities that require gravity processing. Basically all entities.
const gravityEntities = new Set();

world.getAllPlayers().forEach(p => gravityEntities.add(p));


// Subscribe to generic entity spawn events for non-player entities.
world.afterEvents.entitySpawn.subscribe((eventData) => {
  if (eventData.entity.dimension.id !== "minecraft:the_end") return;  
  gravityEntities.add(eventData.entity)
});

world.afterEvents.entityLoad.subscribe((eventData) => {
  if (eventData.entity.dimension.id !== "minecraft:the_end") return;
  
  gravityEntities.add(eventData.entity);
});


// Subscribe to player dimension change to capture players as they change dimensions.
world.afterEvents.playerDimensionChange.subscribe((eventData) => {
  if (eventData?.player) {
    gravityEntities.add(eventData.player);
  }
});

// Subscribe to player join events to capture players as they join.
world.afterEvents.playerSpawn.subscribe((eventData) => gravityEntities.add(eventData.player));

// Keep the cache up-to-date by removing entities when they are removed; same with players leaving the world.
world.beforeEvents.entityRemove.subscribe((eventData) => gravityEntities.delete(eventData.removedEntity));


system.runInterval(() => {
  for (const entity of gravityEntities) {
    if (entity.isValid && entity.dimension.id === "minecraft:the_end") {
      gravityFuncMain(entity);
    }
  }
}, 1);


world.afterEvents.entityHitEntity.subscribe(event => {
  const { damagingEntity, hitEntity } = event;
  const planet = Planet.isOnPlanet();
  if (!damagingEntity || damagingEntity.typeId !== "minecraft:player" || !planet) return;

  // Check if the player is holding a mace.
  const invComp = damagingEntity.getComponent("minecraft:inventory");
  if (!invComp) return;
  const container = invComp.container;
  const selectedItem = container.getItem(damagingEntity.selectedSlot);
  if (!selectedItem || selectedItem.typeId !== "minecraft:mace") return;

  // Only run if affected by custom gravity.
  const gravity = Gravity.of(damagingEntity);
  if (Math.abs(gravity.value - 9.8) > 0.0001) {
    system.run(() => {
      // Retrieve the fall distance dynamic property.
      const fallDistance = Number(damagingEntity.getDynamicProperty("fall_distance")) || 0;
      let extraDamage = 0;
  
      if (fallDistance >= 1.5) {
        const extraFall = fallDistance - 1.5;
        // First segment: for the first 3 blocks, +8 damage per block.
        const firstSegment = Math.min(extraFall, 3);
        extraDamage += firstSegment * 8;
        // Second segment: for the next 5 blocks, +2 damage per block.
        const secondSegment = Math.max(0, Math.min(extraFall - 3, 5));
        extraDamage += secondSegment * 2;
        // Third segment: beyond 8 blocks total, +1 damage per block.
        const thirdSegment = Math.max(0, extraFall - 8);
        extraDamage += thirdSegment;
      }
  
      if (extraDamage > 0 && typeof hitEntity.applyDamage === "function") {
        hitEntity.applyDamage(extraDamage);
      }
  
      if (typeof damagingEntity.setDynamicProperty === "function") {
        damagingEntity.setDynamicProperty("fall_distance", 0);
      }
  
      if (typeof hitEntity.playAnimation === "function") {
        hitEntity.playAnimation("animation.hurt");
      }
      if (typeof damagingEntity.playSound === "function") {
        damagingEntity.playSound("random.orb");
      }
    });
  }
});

/**
 * Gets the block above the entity's head.
 * @param {Entity} entity - The entity.
 * @return {any|null} The block above the entity or null if unavailable.
 */
function canMoveUp(entity) {
  let head = entity.getHeadLocation()
  let location = sumObjects(head, {y: entity.knockback?.y})

  if (entity.dimension.heightRange.max < location.y) return true;
  let rayHit = entity.dimension.getBlockFromRay(head, getDirection3D(head, location), {
    maxDistance: 0.5,
    includeLiquidBlocks: false,
    includePassableBlocks: false
  })
  return rayHit == undefined
}

/**
 * Gets the block in the direction the entity is moving.
 * Validates that location and movement vector values are numbers.
 * @param {Entity} entity - The entity.
 * @return {any|null} The block in the movement direction or null if unavailable.
 */
function canMoveForward(entity) {
  let location = sumObjects(entity.location, entity.movementDirection || {})
  location.y = entity.location.y
  let rayHit = entity.dimension.getBlockFromRay(entity.location, getDirection3D(entity.location, location), {
    maxDistance: 1
  })
  return rayHit == undefined
}


/**
 * Gets the block just below the entity.
 * Ensures that the entity's location values are valid numbers.
 * @param {Entity} entity - The entity.
 * @return {any|null} The block below the entity or null if unavailable.
 */
function getBlockBelow(entity) {
  const loc = entity.location;
  loc.y -= 1;
  return entity.dimension.getBlock(loc);
}


function applyKnockback(player, x, z, power, y) {
  if (player.knockback == undefined) {
    player.knockback = {
      x: 0,
      y: 0,
      z: 0,
      time: system.currentTick
    }
  }

  player.knockback.y += y
  player.knockback.x += x * power
  player.knockback.z += z * power

  if (player.knockback.y < 0.1 && player.knockback.y > 0) player.knockback.y = 0

  if (player.knockback.time != system.currentTick) {
    if (player.knockback.x || player.knockback.y || player.knockback.z) {
      const magnitude = Math.sqrt(player.knockback.x ** 2 + player.knockback.z ** 2);
      const normalized = magnitude > 0 ? { x: player.knockback.x / magnitude, z: player.knockback.z / magnitude } : { x: 0, z: 0 };
      const horizontalForce = { x: normalized.x * magnitude, z: normalized.z * magnitude };
      player.applyKnockback(horizontalForce, player.knockback.y);
      player.knockback = {
        x: 0,
        y: 0,
        z: 0,
        time: system.currentTick
      }
    }
  }
}
