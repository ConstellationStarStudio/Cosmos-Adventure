import { world, system, ItemStack, Player } from '@minecraft/server';

/**
 * @Class Quick Item Database V3.5 by Carchi77
 * @Contributors Drag0nD - Coptaine
 * @ Made to fix script api's missing method to save items as object.
 * @ Optimized for low end devices while keeping fast loading times.
 * @ Does NOT impact ingame performance.
 * @ Uses entities inventory and structures.
 * @ Zero data loss: items are saved as a perfect clone.
 * @Example how to setup a database:
 * ```
 * // Initializing a database with a namespace and logs active
 * const itemDatabase = new QuickItemDatabase("namespace", 1, true);
 * 
 * 
 * ```
**/
export class QuickItemDatabase {
	/**
	 * @param {string} namespace The unique namespace for the database keys.
	 * @param {number} saveRate The rate of background saves per Tick (50ms), 1 is the recomended value for normal usage, you can use an higher rate if you need to save more than 1 key per tick (performance will be affected).
	 * @param {boolean} logs If set to true, the database will log script latency in ms.
	 */
	constructor(namespace = "", saveRate = 2, logs = false) {
		this.#saveRate = saveRate
		this.#settings = {
			logs: logs || false,
			namespace: namespace
		};
		this.#queuedKeys = []
		this.#queuedValues = []
		this.#quickAccess = new Map()
		this.#validNamespace = /^[a-z0-9_]*$/.test(this.#settings.namespace)
		this.#structure = world.structureManager;
		this.#dimension = world.getDimension("overworld");
		this.#sL = world.getDynamicProperty("storagelocation");
		world.afterEvents.playerSpawn.subscribe(e => {
			if (!this.#validNamespace) throw new Error(`§c[Item Database] ${namespace} isn't a valid namespace. accepted char: a-z 0-9 _`);
			else if (!world.getDynamicProperty("init")) {
				const { player } = e;
				const plc = player.location;
				if (!this.#sL) {
					this.#sL = { x: plc.x, y: 318, z: plc.z };
					world.setDynamicProperty("storagelocation", this.#sL);
					this.#dimension.runCommand(`/tickingarea add ${this.#sL.x} 319 ${this.#sL.z} ${this.#sL.x} 318 ${this.#sL.z} storagearea`);
				}
				this.#sL = world.getDynamicProperty("storagelocation");
				world.setDynamicProperty("init", true);
				console.log(`§q[Item Database] is initialized successfully. namespace: ${this.#settings.namespace}`)
			}
		});
		system.runInterval(() => {
			if (this.#queuedKeys.length) {
				const start = Date.now()
				const k = Math.min(this.#saveRate,...this.#queuedKeys)
				for (let i = 0; i < k; i++) {
					this.#romSave(this.#queuedKeys[0], this.#queuedValues[0]); if (logs) this.#timeWarn(start, this.#queuedKeys[0], "saved"); this.#queuedKeys.shift(); this.#queuedValues.shift()
				}
			}
		})
	}
	#saveRate;
	#validNamespace;
	#queuedKeys;
	#settings;
	#structure;
	#quickAccess;
	#queuedValues;
	#dimension;
	#sL;
	#load(key) {
		if (key.length > 30) throw new Error(`§c[Item Database] Out of range: <${key}> has more than 30 characters`)
		let canStr = false;
		try {
			this.#structure.place(key, this.#dimension, this.#sL, { includeEntities: true });
			canStr = true;
		} catch {
			this.#dimension.spawnEntity("sc:storage", this.#sL);
		}
		const entities = this.#dimension.getEntities({ location: this.#sL, type: "sc:storage" });
		if (entities.length > 1) entities.forEach((e, index) => entities[index + 1]?.remove());
		const entity = entities[0];
		const inv = entity.getComponent("inventory").container;
		return { canStr, inv };
	}
	async #save(key, canStr) {
		if (canStr) this.#structure.delete(key);
		this.#structure.createFromWorld(key, this.#dimension, this.#sL, this.#sL, { saveMode: "World", includeEntities: true });
		const entities = this.#dimension.getEntities({ location: this.#sL, type: "sc:storage" });
		entities.forEach(e => e.remove());
	}
	#timeWarn(time, key, action) {
		console.warn(`[Item Database] ${Date.now() - time}ms => ${action} ${key} `);
	}
	async #queueSaving(key, value) {
		this.#queuedKeys.push(key)
		this.#queuedValues.push(value)
	}
	async #romSave(key, value) {
		const { canStr, inv } = this.#load(key);
		if (!value) for (let i = 0; i < 256; i++) inv.setItem(i, undefined), world.setDynamicProperty(key, null);
		if (Array.isArray(value)) {
			try { for (let i = 0; i < 256; i++) inv.setItem(i, value[i] || undefined) } catch 
			{ throw new Error(`§c[Item Database] Invalid value type. supported: ItemStack | ItemStack[] | undefined`) }
			world.setDynamicProperty(key, true)
		} else {
			try { inv.setItem(0, value), world.setDynamicProperty(key, false) } catch 
			{ throw new Error(`§c[Item Database] Invalid value type. supported: ItemStack | ItemStack[] | undefined`) }
		}
		this.#save(key, canStr);
	}

	/**
	 * Sets a value as a key in the item database.
	 * @param {string} key The unique identifier of the value.
	 * @param {ItemStack[] | ItemStack} value The `ItemStack[]` or `itemStack` value to set.
	 * @throws Throws if `value` is an array that has more than 255 items.
	 * @Example Example:
	 * ```
	 * // Setting an individual item as a key
	 * itemDatabase.set("item_0", itemStack); //set the itemstack as a key
	 * // The key can be lower-case letters (a-z), numbers (0-9), undescore (_)
	 * 
	 * // Setting an array of items as a key
	 * itemDatabase.set("items_array_0", itemStacks); // max 255 items per array
	 * 
	 * ```
	 */
	set(key, value) {
		if (!this.#validNamespace) throw new Error(`§c[Item Database] Invalid name: <${this.#settings.namespace}>. accepted char: a-z 0-9 _`);
		if (!/^[a-z0-9_]*$/.test(key)) throw new Error(`§c[Item Database] Invalid name: <${key}>. accepted char: a-z 0-9 _`);
		const time = Date.now();
		key = this.#settings.namespace + ":" + key;
		if (Array.isArray(value)) {
			if (value.length > 255) throw new Error(`§c[Item Database] Out of range: <${key}> has more than 255 ItemStacks`)
			world.setDynamicProperty(key, true)
		} else {
			world.setDynamicProperty(key, false)
		}
		this.#quickAccess.set(key, value)
		if (this.#queuedKeys.includes(key)) {
			const i = this.#queuedKeys.indexOf(key)
			this.#queuedValues.splice(i, 1)
			this.#queuedKeys.splice(i, 1)
		}
		this.#queueSaving(key, value)
		if (this.#settings.logs) this.#timeWarn(time, key, "set");
	}
	/**
	 * Gets the value of a key from the item database.
	 * @param {string} key The identifier of the value.
	 * @returns {ItemStack | ItemStack[]} The `ItemStack` | `ItemStack[]` saved as `key`
	 * @throws Throws if the key doesn't exist.
	 * @Example Example:
	 * ```
	 * // Getting an ItemStack
	 * const itemStack = itemDatabase.get("item0");
	 * 
	 * // Getting an array of items
	 * const itemStacks = itemDatabase.get("items_array_0");
	 * 
	 * 
	 * ```
	 */
	get(key) {
		if (!this.#validNamespace) throw new Error(`§c[Item Database] Invalid name: <${this.#settings.namespace}>. accepted char: a-z 0-9 _`);
		if (!/^[a-z0-9_]*$/.test(key)) throw new Error(`§c[Item Database] Invalid name: <${key}>. accepted char: a-z 0-9 _`);
		const time = Date.now();
		key = this.#settings.namespace + ":" + key;
		if (this.#quickAccess.has(key)) { if (this.#settings.logs) this.#timeWarn(time, key, "got"); return this.#quickAccess.get(key); }
		if (!this.#structure.get(key)) throw new Error(`§c[Item Database] The key <${key}> doesn't exist.`);
		const { canStr, inv } = this.#load(key);
		const items = [];
		for (let i = 0; i < 256; i++) items.push(inv.getItem(i));
		for (let i = 255; i >= 0; i--) if (!items[i]) items.pop(); else break;
		this.#save(key, canStr);
		if (this.#settings.logs) this.#timeWarn(time, key, "got");
		if (world.getDynamicProperty(key)) { this.#quickAccess.set(key, items); return items }
		else { this.#quickAccess.set(key, items[0]); return items[0]; }
	}
	/**
	 * Checks if a key exists in the item database.
	 * @param {string} key The identifier of the value.
	 * @returns {boolean}`true` if the key exists, `false` if the key doesn't exist.
	 * @Example Example:
	 * ```
	 * // Checking if a key exists in the database
	 * const boolean = itemDatabase.has("item_0");
	 * ```
	 */
	has(key) {
		if (!this.#validNamespace) throw new Error(`§c[Item Database] Invalid name: <${this.#settings.namespace}>. accepted char: a-z 0-9 _`);
		if (!/^[a-z0-9_]*$/.test(key)) throw new Error(`§c[Item Database] Invalid name: <${key}>. accepted char: a-z 0-9 _`);
		const time = Date.now();
		key = this.#settings.namespace + ":" + key;
		const exist = this.#quickAccess.has(key) || this.#structure.get(key)
		if (this.#settings.logs) this.#timeWarn(time, key, `has ${!!exist}`);
		if (exist) return true; else return false
	}
	/**
	 * Deletes a key from the item database.
	 * @param {string} key The identifier of the value.
	 * @throws Throws if the key doesn't exist.
	 * @Example Example:
	 * ```
	 * // Deleting a key and its value from the database 
	 * itemDatabase.delete("items_array_0");
	 * 
	 * 
	 * ```
	 */
	delete(key) {
		if (!this.#validNamespace) throw new Error(`§c[Item Database] Invalid name: <${this.#settings.namespace}>. accepted char: a-z 0-9 _`);
		if (!/^[a-z0-9_]*$/.test(key)) throw new Error(`§c[Item Database] Invalid name: <${key}>. accepted char: a-z 0-9 _`);
		const time = Date.now();
		key = this.#settings.namespace + ":" + key;
		if (this.#quickAccess.has(key)) this.#quickAccess.delete(key)
		if (this.#structure.get(key)) this.#structure.delete(key), world.setDynamicProperty(key, null);
		else throw new Error(`§c[Item Database] The key <${key}> doesn't exist.`);
		if (this.#settings.logs) this.#timeWarn(time, key, "removed");
	}
	/**
	 * Gets all the keys of your namespace from item database.
	 * @return {string[]} All the keys as an array of strings.
	 * @Example Example:
	 * ```
	 * const string[] = itemDatabase.keys()
	 * 
	 * 
	 * ```
	 */
	keys() {
		if (!this.#validNamespace) throw new Error(`§c[Item Database] Invalid name: <${this.#settings.namespace}>. accepted char: a-z 0-9 _`);
		const allIds = world.getDynamicPropertyIds()
		const ids = []
		allIds.filter(id => id.startsWith(this.#settings.namespace + ":")).forEach(id => ids.push(id.replace(this.#settings.namespace + ":", "")))
		return ids;
	}
	/**
	 * Gets all the keys of your namespace from item database (takes some time if values aren't alredy loaded in quickAccess).
	 * @return {ItemStack[][]} All the values as an array of ItemStack or ItemStack[].
	 * @Example Example:
	 * ```
	 * const ItemStack[][] = itemDatabase.values()
	 * 
	 * 
	 * ```
	 */
	values() {
		if (!this.#validNamespace) throw new Error(`§c[Item Database] Invalid name: <${this.#settings.namespace}>. accepted char: a-z 0-9 _`);
		const time = Date.now();
		const allIds = world.getDynamicPropertyIds()
		const values = []
		const filtered = allIds.filter(id => id.startsWith(this.#settings.namespace + ":")).map(id => id.replace(this.#settings.namespace + ":", ""))
		for (const key of filtered) {
			values.push(this.get(key));
		}
		if (this.#settings.logs) this.#timeWarn(time, `${JSON.stringify(values)}`, "values");
		return values;
	}
	/**
	 * Clears all, CAN NOT REWIND.
	 * @Example Example:
	 * ```
	 * itemDatabase.clear()
	 * 
	 * 
	 * ```
	 */
	clear() {
		if (!this.#validNamespace) throw new Error(`§c[Item Database] Invalid name: <${this.#settings.namespace}>. accepted char: a-z 0-9 _`);
		const time = Date.now();
		const allIds = world.getDynamicPropertyIds()
		const filtered = allIds.filter(id => id.startsWith(this.#settings.namespace + ":")).map(id => id.replace(this.#settings.namespace + ":", ""))
		for (const key of filtered) {
			this.delete(key)
		}
		if (this.#settings.logs) this.#timeWarn(time, ``, "clear");
	}
}