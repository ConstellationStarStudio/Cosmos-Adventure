/**
 * ★★★★★★★★★★★★★★★★★★★★
 * Лети со мной, мой милый,    // Лети зі мною, мій милий,
 * К звёздам, где мечты светили.  // До зірок, де мрії світять.
 * Держи меня крепко, не отпускай,  // Тримай мене міцно, не відпускай.
 * Мгновение вечно — не забывай.  // Мить вічна — не забувай.
 * 
 * Пока всё было, пусть замрёт,  // Поки все було, нехай замре.
 * Время не вернётся, пусть не ждёт. // Час не повернеться, нехай не чекає.
 * Всё было навсегда,  // Все було назавжди.
 * В космоса бескрайняя утренняя звезда. // В безкрайній космос, рання зірка.
 * ★★★★★★★★★★★★★★★★★★★★
 */
// Lum Studio //
import { world } from "@minecraft/server";
export { EndlessDB };

// Maximum number of characters per dynamic property part.
const PART_SIZE = 32767;

/**
 * EndlessDynamicProperty
 *
 * This class provides a simple key/value "database" that uses multiple dynamic properties
 * to overcome the 32K byte storage limit per property. It stores JSON data by splitting
 * it into parts and keeps track of the number of parts using a dedicated count property.
 *
 * Example usage:
 * ```js
 *   const db = new EndlessDB("myDB:");
 *   db.setAll({ foo: "bar", count: 123 });
 *   const data = db.getAll();
 *   console.log(data);
 * ```
 * Note: Make sure that the prefix you supply is unique to avoid collisions.
 */
class EndlessDB {
  /**
   * @param {string} prefix - Unique prefix for this dynamic property store.
   */
  constructor(prefix) {
    this.prefix = prefix;
  }

  /**
   * Get the current number of parts used for storing data.
   * If not defined, defaults to 1.
   * @returns {number}
   */
  get count() {
    const value = world.getDynamicProperty(this.prefix + "count");
    return typeof value === "number" ? value : 1;
  }

  /**
   * Sets the part count.
   * @param {number} value
   */
  set count(value) {
    world.setDynamicProperty(this.prefix + "count", value);
  }

  /**
   * Retrieves the stored data by concatenating all parts and parsing the JSON.
   * @returns {object} The stored data object (or {} if empty or invalid).
   */
  getAll() {
    let jsonStr = "";
    for (let i = 0; i < this.count; i++) {
      const part = world.getDynamicProperty(this.prefix + "part_" + i);
      jsonStr += part ?? "";
    }
    try {
      return JSON.parse(jsonStr === "" ? "{}" : jsonStr);
    } catch (error) {
      console.error("EndlessDB: Error parsing JSON:", error);
      return {};
    }
  }

  /**
   * Stores the given object as JSON by splitting it into parts and saving each part
   * as a separate dynamic property.
   * @param {object} object - The data to store.
   */
  setAll(object) {
    const jsonStr = JSON.stringify(object);
    let remaining = jsonStr;
    let i = 0;
    while (remaining.length > 0) {
      const part = remaining.slice(0, PART_SIZE);
      world.setDynamicProperty(this.prefix + "part_" + i, part);
      remaining = remaining.slice(PART_SIZE);
      i++;
    }
    this.count = i;
  }

  /**
   * Clears all dynamic properties associated with this store.
   */
  clear() {
    const keys = world.getDynamicPropertyIds();
    for (const key of keys) {
      if (key.startsWith(this.prefix + "part_") || key === this.prefix + "count") {
        world.setDynamicProperty(key, undefined);
      }
    }
  }
}


