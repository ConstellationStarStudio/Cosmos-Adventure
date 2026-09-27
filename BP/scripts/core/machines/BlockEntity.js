import { Entity, system, world } from "@minecraft/server";

class BlockEntity {
  position;
  runId;
  block;
  entity;
  constructor(block, entity) {
    BlockEntityData.className[entity] = this;
    this.block = {id: block};
    this.position = entity.location;
    this.entity = entity;
    this.runId = system.runInterval(() => {
      // if (!this.entity.isValid()) { 
      //   this.destroy();
      //   system.clearRun(this.runId);
      //   return;
      // };
      return this.onTick();
    });
  }
  onLoad() {}
  onInit() {}
  onTick() {}
  onPlace() {}
  onDestroy() {}
  destroy() {
    const BlockEntitySelf = BlockEntityData.getFromCoords(this.position);
    BlockEntitySelf?.destroy();
    BlockEntityData.list.delete(this.position);
    this.clearContainer();
    try {
      this.entity.remove();
    } catch (e) {}
  };
  clearContainer() {
    const container = this.entity.getComponent('minecraft:inventory')?.container;
    if(container) {
      for(let i = 0; i < container.size; i++) {
        if (container.getItem(i)?.typeId == 'cosmos:ui') {
          container.setItem(i, undefined)
      }
      }
    }
  }
}

class BlockEntityData {
  static className = {};
  static list = new Map();
  /**
   *
   * @param {Entity} entity
   */
  static defineEntity(entity) {
    const id = entity.typeId;
    if (!id.startsWith("cosmos:machine:")) {
      return false;
    }
    return id.replace("cosmos:machine:", "");
  }
  /**
   *
   * @param {Vector3} coords
   */
  static getFromCoords(coords) {
    if (!this.list.has(coords)) return null;
    return this.list.get(coords);
  }
  static compelete = (() => {
    world.afterEvents.entitySpawn.subscribe((descriptor) => {
      const entity = descriptor.entity;
      const block = entity.dimension.getBlock(entity.location);
      const machineEntity = this.defineEntity(entity);
      if (machineEntity) {
        const BlockEntity = this.className[machineEntity];
        this.list.set(
          block.location,
          new BlockEntity(
            Object.assign(entity, { location: block.location }),
            `cosmos:${block}`
          )
        );
        const result = this.getFromCoords(block.location);
        result?.onInit();
      }
    });

    world.afterEvents.playerBreakBlock.subscribe((descriptor) => {
      const coords = descriptor.block.location;
      const BlockEntity = this.getFromCoords(coords);
      if (BlockEntity) {
        BlockEntity?.onDestroy();
        BlockEntity?.destroy();
        this.list.delete(coords);
      }
    });
  })();
}
