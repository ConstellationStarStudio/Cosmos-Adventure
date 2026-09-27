import * as mc from "@minecraft/server";
import ALL_PLANETS from "../planets/AllPlanets";
import { getPlanetByLocation } from "./utils";

/**
 * Originally from "ConMaster2112"
 * Rewritten and modified by "Remember M9"
 * @type {<T extends {}, U>(target: T, source: T & {}) => T & U}
*/
globalThis.Merge = (() => {
    const { defineProperties: a, getOwnPropertyDescriptors: b, getPrototypeOf: c, setPrototypeOf: z } = Object;
    return (origin, object, getObject = false) => {
        const prototypeOrigin = z(a({}, b(origin)), c(origin));
        z(object, prototypeOrigin);
        a(origin, b(object));
        return getObject && object;
    };
})();

const { world, ItemStack } = mc;

//@ts-expect-error
Merge(mc.ItemStack.prototype, {

    decrementStack(decrementItemAmount = 1) {
        if (this.amount > decrementItemAmount) {
            this.amount = this.amount - decrementItemAmount;
            return this;
        } else return undefined;
    },

    incrementStack(incrementItemMax = 64, incrementItemAmount = 1) {
        if ((incrementItemMax === 64) ? this.amount < incrementItemMax : this.amount <= incrementItemMax) {
            this.amount = this.amount + incrementItemAmount;
        } return this;
    }

});


//@ts-expect-error
Merge(mc.Player.prototype, {

    give(item, amount = 1, data = 0) {
        const cmdfeedback = world.gameRules.sendCommandFeedback;
        world.gameRules.sendCommandFeedback = false;
        this.runCommand(`give @s ${item} ${amount} ${data}`);
        this.runCommand("stopsound @s random.pop");
        world.gameRules.sendCommandFeedback = cmdfeedback;
    },

    getPlanet() {
        const dimId = this.dimension.id;
        const entry = ALL_PLANETS.find(p => p.dimensionId === dimId || p.id === dimId.replace("cosmos:", ""));
        if (entry) return entry.class;
        if (dimId === "minecraft:the_end") {
            return getPlanetByLocation(this.location, this.dimension);
        }
        return undefined;
    }
});


//@ts-expect-error
Merge(mc.Block.prototype, {
    getPlanet(){
        const dimId = this.dimension.id;
        const entry = ALL_PLANETS.find(p => p.dimensionId === dimId || p.id === dimId.replace("cosmos:", ""));
        if (entry) return entry.class;
        if (["cosmos:space_stations", "minecraft:the_end"].includes(dimId)) {
            return getPlanetByLocation(this.location, this.dimension);
        }
        return undefined;
    },
});


//@ts-expect-error
Merge(mc.World.prototype, {
    getDims(fn) {
        // dimension.getEntities returns a entity array, so flatMap to combine it into one array
        return ['overworld', 'nether', 'the_end', 'cosmos:moon', 'cosmos:mars'].flatMap(dim => {
            try {
                const dimension = this.getDimension(dim);
                return fn ? fn(dimension) : dimension;
            } catch (e) {
                return [];
            }
        })
    },
    getPlanet(type){
        return ALL_PLANETS.find((planet) => planet.id == type || planet.dimensionId == type)?.class;
    }
});

Merge(mc.Entity.prototype, {
    getPlanet(){
        const dimId = this.dimension.id;
        const entry = ALL_PLANETS.find(p => p.dimensionId === dimId || p.id === dimId.replace("cosmos:", ""));
        if (entry) return entry.class;
        if (["cosmos:space_stations", "minecraft:the_end"].includes(dimId)) {
            return getPlanetByLocation(this.location, this.dimension);
        }
        return undefined;
    },
});


//@ts-expect-error
Merge(mc.Container.prototype, {

    add_ui_display(slot, text, damage) {
        const button = new ItemStack('cosmos:ui')
        if (damage) {
            const durability = button.getComponent('durability')
            durability.damage = durability.maxDurability - damage
        }
        button.nameTag = text ?? ''
        super.setItem(slot, button)
    },

    add_ui_toggle(slot, damage) {
        const button = new ItemStack('cosmos:ui_button')
        if (damage) {
            const durability = button.getComponent('durability')
            durability.damage = durability.maxDurability - damage
        }
        super.setItem(slot, button)
    },

    add_ui_button(slot, text, entity, property, value) {
        if (super.getItem(slot)) return
        const button = new ItemStack('cosmos:ui_button')
        button.nameTag = text ?? ''
        super.setItem(slot, button)
        if (property) entity.setDynamicProperty(property, value)
    },

    was_ui_clicked(slot, machine) {
        const item = this.getItem(slot);
        if (!item || (item.typeId !== 'cosmos:ui' && item.typeId !== 'cosmos:ui_button')) {
            const player = machine.dimension.getPlayers({closest: 1, location: machine.location})[0];
            
            if (item) {
                if (player) {
                    const cursor = player.getComponent('minecraft:cursor_inventory');
                    if (cursor) {
                        try {
                            cursor.item = item;
                        } catch (e) {
                            cursor.clear();
                            const leftover = player.getComponent('inventory').container.addItem(item);
                            if (leftover) player.dimension.spawnItem(leftover, player.location);
                        }
                    } else {
                        const leftover = player.getComponent('inventory').container.addItem(item);
                        if (leftover) player.dimension.spawnItem(leftover, player.location);
                    }
                } else {
                    machine.dimension.spawnItem(item, machine.location);
                }
            } else if (player) {
                const cursor = player.getComponent('minecraft:cursor_inventory');
                if (cursor?.item?.typeId === 'cosmos:ui' || cursor?.item?.typeId === 'cosmos:ui_button') {
                    cursor.clear();
                }
            }

            //sweeps the player inventory for leaked ui items
            if (player) {
                const pinv = player.getComponent('inventory')?.container;
                if (pinv) {
                    for (let i = 0; i < pinv.size; i++) {
                        const pItem = pinv.getItem(i);
                        if (pItem && (pItem.typeId === 'cosmos:ui' || pItem.typeId === 'cosmos:ui_button')) {
                            pinv.setItem(i);
                        }
                    }
                }
            }
            return true;
        }
        return false;
    },

    updateUI(uiConfigs, data) {
        uiConfigs.forEach(config => {
            const uiItem = new ItemStack('cosmos:ui');
            const text = (typeof config.text === 'function')
                ? config.text(data)
                : (config.text || "");
            uiItem.nameTag = `cosmos:${text}`;
            if (config.lore) {
                const lore = (typeof config.lore === 'function')
                    ? config.lore(data)
                    : config.lore;
                uiItem.setLore(lore);
            }
            super.setItem(config.slot, uiItem);
        });
    }

});


//@ts-expect-error
Merge(mc.Dimension.prototype, {

    stopSound(soundName, location) {
        return this.runCommand(
            `execute positioned ${location.x} ${location.y} ${location.z} run stopsound @a ${soundName}`
        );
    }

});


//Feel free to take out keys from these if you need any so it wont get deleted
//This is just to reduce unused prototypes
;['__quote', 'anchor', 'big', 'blink', 'bold', 'fixed', 'fontcolor', 'fontsize', 'italics', 'link', 'localeCompare', 'sub', 'sup', 'small', 'strike', 'toLocaleLowerCase', 'toLocaleUpperCase']
    .forEach(key => delete String.prototype[key]);

["decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent", "escape", "unescape", "ArrayBuffer", "SharedArrayBuffer", "Uint8ClampedArray", "Int8Array", "Uint8Array", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "BigInt64Array", "BigUint64Array", "Float32Array", "Float64Array", "print"]
    .forEach(key => delete globalThis[key]);