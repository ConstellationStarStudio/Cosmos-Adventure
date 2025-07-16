import { world, system, EquipmentSlot, ItemStack } from '@minecraft/server';
import { update_tank } from './oxygen.js';

// This code is better now, but it still normal
const tanks = {
	"cosmos:oxygen_tank_light_full": "light",
	"cosmos:oxygen_tank_med_full": "medium",
	"cosmos:oxygen_tank_heavy_full": "heavy",
	"cosmos:oxygen_tank_infinite": "infinite",
}

const slots = {
	head: ["cosmos:thermal_helmet"],
	body: ["cosmos:thermal_chestplate"],
	legs: ["cosmos:thermal_leggings"],
	feet: ["cosmos:thermal_boots"],
	tank1: Object.keys(tanks),
	tank2: Object.keys(tanks),
	frequency_module: "cosmos:frequency_module",
	mask: "cosmos:oxygen_mask",
	parachute: ["cosmos:parachute_black", "cosmos:parachute_blue", "cosmos:parachute_brown", "cosmos:parachute_darkblue", "cosmos:parachute_darkgray", "cosmos:parachute_darkgreen", "cosmos:parachute_gray", "cosmos:parachute_lime", "cosmos:parachute_magenta", "cosmos:parachute_orange", "cosmos:parachute_pink", "cosmos:parachute_plain", "cosmos:parachute_purple", "cosmos:parachute_red", "cosmos:parachute_teal", "cosmos:parachute_yellow", undefined],
	thermal: ["cosmos:shield_controller"],
	gear: "cosmos:oxygen_gear"
};

export let space_gear_entities = new Map();

/* unused
const maskTag = "mask(-)cosmos:oxygen_mask";
const gearTag = "gear(-)cosmos:oxygen_gear";
*/

// SPAWNS, NAMES, AND GIVES ITEMS TO THE ENTITY
function spawn(player) {
	const in_bounds_location = player.location
	const { min, max } = player.dimension.heightRange
	in_bounds_location.y = Math.min(Math.max(in_bounds_location.y, min), max)
	const entity = player.dimension.spawnEntity("cosmos:inv_ent", in_bounds_location);
	entity.nameTag = "space_gear(-)"; // needed for condition in UI
	entity.setDynamicProperty('owner', player.nameTag)
	space_gear_entities.set(player.nameTag, entity.id)
	setItems(player, entity)
	return entity
}

// DESPAWN OR KILL THE ENTITY
function despawn(entity, kill = false) {
	if (entity) system.run(() => {
		if (kill) entity.runCommand("kill")
		try { entity.triggerEvent("cosmos:despawn") } catch (error) { null }
	})
}

// GIVES ITEMS TO THE ENTITY
function setItems(player, entity) {
	const container = entity.getComponent("inventory").container
	const space_gear = JSON.parse(player.getDynamicProperty("space_gear") ?? '{}')
	for (let i = 0, slotKeys = Object.keys(slots); i < slotKeys.length; i++) {
		const slot = slotKeys[i]
		if (space_gear[slot]) {
			const [item_id, fill_level] = space_gear[slot].split(' ')
			const item = new ItemStack(item_id)
			const durability = item.getComponent('minecraft:durability')
			if (durability) {
				durability.damage = durability.maxDurability - fill_level
			}
			container.setItem(i, item)
		} else container.setItem(i)
	}
}

// UPDATE SPACE GEAR DYNAMIC PROPERTY AND PLAYER PROPERTIES
function update(player, container) {
	const space_gear = JSON.parse(player.getDynamicProperty("space_gear") ?? '{}')
	let oxygen = player.getDynamicProperty("cosmos_o2")
	oxygen = (oxygen)? JSON.parse(oxygen): undefined;
	for (let i = 0, slotKeys = Object.keys(slots); i < slotKeys.length; i++) {
		const slot = slotKeys[i]
		const item = container.getItem(i);
		switch (slot) {
			case 'frequency_module':
				player.setProperty("cosmos:frequency_module", item?.typeId == "cosmos:frequency_module")
			break; case 'gear':
				player.setProperty("cosmos:oxygen_gear", item?.typeId == "cosmos:oxygen_gear")
			break; case 'mask':
				player.setProperty("cosmos:oxygen_mask", item?.typeId == "cosmos:oxygen_mask")
			break; case 'tank1':
				player.setProperty("cosmos:tank1", tanks[item?.typeId] ?? 'no_tank')
			break; case 'tank2':
				player.setProperty("cosmos:tank2", tanks[item?.typeId] ?? 'no_tank')
		}
		if (item) {
			let durability = item.getComponent("minecraft:durability")
			let saved_durability = durability ? durability.maxDurability - durability.damage:
			0;
			space_gear[slot] = item.typeId + (durability ? ' ' + saved_durability : '')
		} else delete space_gear[slot]
	} 
	player.setDynamicProperty("space_gear", JSON.stringify(space_gear))
}
// trigger event after player interact with any block(imitation of right click detection)
world.beforeEvents.playerInteractWithBlock.subscribe((data) => {
	if (!data.isFirstEvent || !data.player.isSneaking || data.itemStack) return;
	let player = data.player;
	data.cancel = true;
	if(space_gear_entities.get(player.nameTag)) return;
	system.run(() => {
		let entity = spawn(player)
		let secondInventory = system.runInterval(() => {
			if(!entity.isValid){
				space_gear_entities.delete(player.nameTag)
				system.clearRun(secondInventory)
				return;
			}
			// LET ENTITY FOLLOW THE PLAYER
			const location = player.location;
			entity.teleport(location, { dimension: player.dimension });
			// REJECT ITEMS AND UPDATE THE INVENTORY
			const container = entity.getComponent("inventory").container;
			//let haveOxyFirst = false; let tank1; let tank2;
			for (let i = 0, slotValues = Object.values(slots); i < slotValues.length; i++) {
				let item = container.getItem(i);
				if (!item) continue;
				if (!slotValues[i].includes(item.typeId)) {
					player.dimension.spawnItem(item, location);
					container.setItem(i)

				} else if (item.amount > 1) { //allows 1 accepted item to be equipped
					item.amount -= 1;
					player.dimension.spawnItem(item, location);
					item.amount = 1;
					container.setItem(i, item)

				}
			} update(player, container)
			if ((!player.isSneaking && !entity.getDynamicProperty('view')) || !player.isValid) {
				space_gear_entities.delete(player.nameTag)
				despawn(entity)
				system.clearRun(secondInventory)
				return;
			}
			// CAMERA MOVEMENT DETECTION TO DESPAWN THE ENTITY
			let camera = player.getRotation(); camera = `${Math.round(camera.x)} ${Math.round(camera.y)}`
			const view = entity.getDynamicProperty('view')
			if (view && (camera != view)){
				despawn(entity)
				space_gear_entities.delete(player.nameTag);
				system.clearRun(secondInventory);
				return;
			}
		});
	});
})
// PREVENT OTHER PLAYERS FROM INTERACTING WITH THE ENTITY
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
	const { player, target: entity } = event;
	if (entity.typeId != 'cosmos:inv_ent') return;

	const owner = entity.getDynamicProperty('owner')
	if (owner != player.nameTag) { event.cancel = true; return }

	const holdingItem = player.getComponent("equippable").getEquipment(EquipmentSlot.Mainhand)
	if (!player.isSneaking || holdingItem) { event.cancel = true; despawn(entity); return }

	let camera = player.getRotation(); camera = `${Math.round(camera.x)} ${Math.round(camera.y)}`
	system.run(() => { entity.setDynamicProperty('view', camera) })
});

// DESPAWN ENTITY ON HIT
world.afterEvents.entityHitEntity.subscribe(({ hitEntity: entity, damagingEntity: player }) => {
	if (entity.typeId == 'cosmos:inv_ent' && player.typeId == "minecraft:player") despawn(entity)
});

//DROP ITEMS AND DELETE ENTITY ON PLAYER DEATH
world.afterEvents.entityDie.subscribe(({ deadEntity: player }) => {
	if (player.typeId != "minecraft:player") return
	const entities = player.dimension.getEntities({ type: "cosmos:inv_ent" })//.filter(entity => entity.getDynamicProperty('owner') != player.nameTag)
	entities.length == 0 ? despawn(spawn(player), !world.gameRules.keepInventory) : entities.forEach(entity => despawn(entity, !world.gameRules.keepInventory))
	if (!world.gameRules.keepInventory) player.setDynamicProperty("space_gear", undefined);
	space_gear_entities.delete(player.nameTag)
});

// DELETING ENTITY ON LEAVING -- This doesn't work for some reason -- crashes the game 
/*world.beforeEvents.playerLeave.subscribe(({player}) =>
	player.dimension.getEntities({type: "cosmos:inv_ent"}).forEach(entity => {
		if (entity.getDynamicProperty('owner') == player.nameTag) despawn(entity)
	})
)*/

//EQUIP ITEMS
system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("cosmos:space_gear", {
		onUse({ source: player, itemStack: item }) {
			const space_gear = JSON.parse(player.getDynamicProperty("space_gear") ?? '{}'); let sound = false
			if (!player.getProperty("cosmos:oxygen_gear") && item.typeId == "cosmos:oxygen_gear") {
				player.runCommand(`clear @s cosmos:oxygen_gear 0 1`)
				space_gear.gear = item.typeId; sound = true
				player.setProperty("cosmos:oxygen_gear", true)
			}
			if (!player.getProperty("cosmos:oxygen_mask") && item.typeId == "cosmos:oxygen_mask") {
				player.runCommand(`clear @s cosmos:oxygen_mask 0 1`)
				space_gear.mask = item.typeId; sound = true
				player.setProperty("cosmos:oxygen_mask", true)
			}
			if (!player.getProperty("cosmos:frequency_module") && item.typeId == "cosmos:frequency_module") {
				player.runCommand(`clear @s cosmos:frequency_module 0 1`)
				space_gear.frequency_module = item.typeId; sound = true
				player.setProperty("cosmos:frequency_module", true)
			}
			if (!space_gear.parachute && slots.parachute.includes(item.typeId)) {
				player.runCommand(`clear @s ${item.typeId} 0 1`)
				space_gear.parachute = item.typeId; sound = true
			}
			if (Object.keys(tanks).includes(item.typeId)) {
				let tank = undefined
				if (player.getProperty("cosmos:tank1") == 'no_tank') tank = "tank1"
				else if (player.getProperty("cosmos:tank2") == 'no_tank') tank = "tank2"
				if (tank) {
					const durability = item.getComponent("minecraft:durability")
					let saved_durability = durability ? durability.maxDurability - durability.damage:
					0;
					player.runCommand(`clear @s ${item.typeId} -1 1`)
					space_gear[tank] = item.typeId + (durability ? ' ' + saved_durability : '');
					sound = true;
					player.setProperty(`cosmos:${tank}`, tanks[item.typeId])
					
				}
			}
			if (sound) player.dimension.playSound("armor.equip_iron", player.location)
			player.setDynamicProperty("space_gear", JSON.stringify(space_gear))
		}
	})
})

/* OXYGEN AND UNUSED FUNCTIONS - preserved for later use 
system.runInterval(async()=>{
	world.getAllPlayers().forEach((P) =>
	{
		let v1 = P.getDynamicProperty("oxygen_tank1")??0;
		let v2 = P.getDynamicProperty("oxygen_tank2")??0;
		if (v1 < 0) {
			v1=0;
			P.setDynamicProperty("oxygen_tank1",0);
		};
		if (v2 < 0) {
			v2=0;
			P.setDynamicProperty("oxygen_tank2",0);
		};
		if (!P.hasTag(maskTag) || !P.hasTag(gearTag) || !checkOxygen(P)) return P.removeTag("oxygen");
		if (v1+v2 > 0){
			P.addTag("oxygen")
		} else {
			P.removeTag("oxygen");
			return
		};
		if (v1>0) P.setDynamicProperty("oxygen_tank1",v1-1);
		if (!v1 && v2>0) P.setDynamicProperty("oxygen_tank1",v2-1);
		
	})
},20);

// returns true when player need oxygen from tanks
function checkOxygen(p){
	//there's no system for oxygen yet, so I left it empty 
	return p.hasTag("oxy_test") // it's only for testing 
}

//RESET DURABILITY SYSTEM
system.afterEvents.scriptEventReceive.subscribe((event)=> {
	if (event.id !== "delete:durability") return;
	let {sourceEntity:p} = event;
	let item = p.getComponent("equippable").getEquipment(EquipmentSlot.Mainhand);
	let dur = item.getComponent("minecraft:durability");
	dur.damage = dur.maxDurability;
	p.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand,item)
})

world.afterEvents.itemUse.subscribe((e)=>{
	all: for (let place of slots){
	local: if (e.itemStack.hasTag("g:"+place)){
		for (let tg of e.source.getTags()){
			if (tg.split("(-)")[0] == place){
				break local;
			};
		};
		e.source.addTag(place+"(-)"+e.itemStack.typeId);
		e.source.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand);
		break all;
	}}
});
*/
