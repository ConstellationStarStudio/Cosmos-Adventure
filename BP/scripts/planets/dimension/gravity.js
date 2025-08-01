import { world, system, Entity } from "@minecraft/server";
import { Planet } from "./GalacticraftPlanets.js"
export { Gravity };


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
}

function getXZVelocity(player) {
  let vector = {
    x: 0,
    z: 0
  }

  const input = player.inputInfo.getMovementVector()
  vector = sumObjects(vector, Geo.rotate({
    x: input.y,
    z: -input.x
  }, player.getRotation().y + 90))

  const speedModifier = (player.getEffect('speed')?.amplifier ?? -1) + 1 - ((player.getEffect('slowness')?.amplifier ?? -1) + 1)
  vector = sumObjects({}, vector, 0.37 + (player.isSprinting ? 0.13 : 0) + speedModifier/10)

  return vector
}

const EntityGravityMod = {
  'minecraft:item': 2.2,
  'minecraft:chicken': 2.5,
  'minecraft:xp_orb': 2.5,
  'minecraft:minecart': 2.5,
  'minecraft:hopper_minecart': 2.5,
  'minecraft:chest_minecart': 2.5,
  'minecraft:tnt_minecart': 2.5,
  'minecraft:command_block_minecart': 2.5,
  'minecraft:boat': 2.5,
  'minecraft:chest_boat': 2.5
}
let GravityEntities = []

world.afterEvents.entityLoad.subscribe(data => {
  if (!GravityEntities.includes(data.entity)) GravityEntities.push(data.entity)
})
world.afterEvents.entitySpawn.subscribe(data => {
  if (!GravityEntities.includes(data.entity)) GravityEntities.push(data.entity)
})

system.runInterval(() => {
  for (let dimension of ['the_end'].map(id => world.getDimension(id))) {
    GravityEntities = GravityEntities.concat(dimension.getEntities().filter(entity => !GravityEntities.includes(entity)))
  }
}, 10)

function setGravity(entity) {
  let gravity = Gravity.of(entity)
  if (entity.dimension.id != 'minecraft:the_end') return gravity.setTemp(9.8);
  for (let planet of Planet.getAll()) {
    if (planet.gravity > 5) continue;
    if (planet.isOnPlanet(entity.location)) {
      gravity.setTemp(planet.gravity)
      return true
    }
  }
  gravity.setTemp(9.8)
}

export function player_gravity(players){
  for (let player of players) {
    const gravity = Gravity.of(player)
    if (gravity.value == 9.8) continue;

    if (player.isOnGround) {
      player.onGroundTick = system.currentTick
    }

    if (player.isJumping && player.onGroundTick >= system.currentTick - 1) {
      player.fallVelocity -= (0.2 * 9.8/( (gravity.value + 9.8*0.2) / 1.2 )) + ((player.getEffect('jump_boost')?.amplifier ?? -1) + 1)/10
    }

    if (player.isOnGround || player.isSwimming || player.isInWater || player.isFlying || player.isGliding) {
      player.fallVelocity = 0
      player.fallingTime = 0
      player.savedXZ = undefined

      continue;
    }  

    player.fallVelocity = player.fallVelocity || 0
    player.fallingTime = (player.fallingTime || 0) + 1

    player.fallVelocity += (9.8*1.5 + gravity.value) / 2.5 / Math.min(300, 190 + player.fallingTime*(9.8 - gravity.value))

    let xz = getXZVelocity(player)
    
    xz = sumObjects({}, sumObjects(xz, player.savedXZ || xz, 5), 1/6)
    player.savedXZ = xz

    const xzPower = Geo.distance({x: 0, y: 0, z: 0}, xz)
    xz = Geo.getDirection3D({x: 0, y: 0, z: 0}, xz)

    if (player.isOnGround && player.fallVelocity < 0) player.fallVelocity = 0;
    if (player.dimension.heightRange.min <= player.location.y || player.dimension.heightRange.max - 2 >= player.location.y) {
      let above = player.dimension.getBlockFromRay(player.getHeadLocation(), { x: 0, y: 1, z: 0 }, { maxDistance: 1 })
      if (above != undefined && player.fallVelocity < 0) player.fallVelocity = 0;

      const locations = [sumObjects(player.location, {y: 0.55}), player.getHeadLocation()]
      if (locations.map(loc => player.dimension.getBlockFromRay(loc, xz)).some((ray, index) => {
        if (ray == undefined) return false;
        if (Geo.distance(sumObjects(ray.faceLocation, ray.block), locations[index]) < 0.6 && !ray.block.isAir) return true;
      })) {
        xz = { x: 0, z: 0 }
        player.savedXZ = xz
      }
    }

    if (player.fallVelocity != 0) player.applyKnockback({x: 0, z: 0}, 0)
    player.applyKnockback({x: xz.x * xzPower, z: xz.z * xzPower}, -player.fallVelocity)
    
    let ray = player.dimension.getBlockFromRay(player.location, { 
      x: 0,
      y: -1,
      z: 0
    })
    if (ray == undefined) return; 

    let distance = player.location.y - sumObjects(ray.block, ray.faceLocation).y
    player.distance = distance
    if (distance < -player.getVelocity().y*3) player.addEffect('slow_falling', 1, { amplifier: 0, showParticles: false });

    player.fallingVelocity = player.fallVelocity/2
  }

  GravityEntities.forEach((entity, index) => {
    if (!entity.isValid || entity.dimension.id != 'minecraft:the_end') return GravityEntities.splice(index, 1);
    setGravity(entity)

    if (entity.isInWater) entity.fallingVelocity = 0;

    if (entity.isOnGround && entity.fallingVelocity > 0) {
      let velocity = entity.fallingVelocity
      let damage = (velocity * 2) ** 1.7
      entity.fallingVelocity = 0
      if (damage >= 1) entity.applyDamage(damage, { cause: 'fall' })
    }

    if (entity.typeId == 'minecraft:player') return;

    const gravity = Gravity.of(entity)
    if (gravity.value == 9.8) return;

    if (entity.isOnGround || entity.isSwimming || entity.isInWater || entity.getComponent('can_fly')) return;

    if (entity.getComponent('projectile') == undefined) {
      entity.applyImpulse({ x: 0, z: 0, y: (9.8 - gravity.value)/130/(EntityGravityMod[entity.typeId] || 1) })

      let ray = entity.dimension.getBlockFromRay(entity.location, { 
        x: 0,
        y: -1,
        z: 0
      })
      if (ray == undefined) return; 


      let distance = entity.location.y - sumObjects(ray.block, ray.faceLocation).y
      entity.distance = distance
      if (distance < -entity.getVelocity().y*2) entity.addEffect('slow_falling', 1, { amplifier: 0, showParticles: false });

      entity.fallingVelocity = -entity.getVelocity().y
    } else {
      let projectile = entity.getComponent('projectile')
      let oldGravity = entity.getDynamicProperty('sert:defaultGravity')
      if (oldGravity == undefined) {
        entity.setDynamicProperty('sert:defaultGravity', projectile.gravity)
        oldGravity = projectile.gravity
      }

      projectile.gravity = oldGravity - (9.8 - gravity.value)*oldGravity/20
    }
  })
}

const Geo = new class {
  distance(vector1, vector2) {
    return Math.sqrt(Math.abs(vector1.x - vector2.x)**2 + Math.abs(vector1.y - vector2.y)**2 + Math.abs(vector1.z - vector2.z)**2)
  }
  
  getDirection3D(vector1, vector2) {
    let dist = this.distance(vector1, vector2) || 1
    return {
      x: (vector2.x - vector1.x)/dist,
      y: (vector2.y - vector1.y)/dist,
      z: (vector2.z - vector1.z)/dist
    }
  }

  rotate(offset, angle, axis = ['x','z']) {
    let offsetDir = Geo.getDirection3D({x: 0, y: 0, z: 0}, sumObjects({}, {[axis[0]]: offset[axis[0]], [axis[1]]: offset[axis[1]]}))
    let offsetDist = Geo.distance({x: 0, y: 0, z: 0}, sumObjects({}, {[axis[0]]: offset[axis[0]], [axis[1]]: offset[axis[1]]}))
    angle += Math.acos(offsetDir[axis[0]])*57.2958 * (offsetDir[axis[1]] < 0 ? -1 : 1)
    let direction = {
      [axis[0]]: Math.cos(angle/57.2958),
      [axis[1]]: Math.sin(angle/57.2958)
    }
    return sumObjects({}, direction, offsetDist)
  }
}

function sumObjects(vector1, vector2, multi = 1) {
  return {
    x: (vector1.x || 0) + (vector2.x || 0) * multi,
    y: (vector1.y || 0) + (vector2.y || 0) * multi,
    z: (vector1.z || 0) + (vector2.z || 0) * multi
  }
}
