import { system } from "@minecraft/server";

/**
 * Helper utilities for the Machine system's Delta Time (dt) ticking logic.
 * Use these to replace tick-based modulo checks (e.g., `system.currentTick % 20`)
 * which can be unreliable in budgeted background ticking.
 */

/**
 * Runs a callback function at a fixed interval, compensating for delta time.
 * Requires storing an accumulator variable in your class.
 * 
 * @example
 * this.timer = tick_interval(this.timer, 20, dt, () => { console.log("Run!"); });
 * 
 * @param {number} accumulator - The current accumulated ticks (state variable).
 * @param {number} interval - How many ticks between executions.
 * @param {number} dt - Delta time passed since last tick.
 * @param {function} callback - Function to execute. May run multiple times if dt is large.
 * @returns {number} - The new accumulator value.
 */
export function tick_interval(accumulator, interval, dt, callback) {
    let ticks = accumulator + dt;
    while (ticks >= interval) {
        callback();
        ticks -= interval;
    }
    return ticks;
}

/**
 * Checks if enough time has passed since a last update (e.g. for UI refreshes).
 * 
 * @example
 * if (should_update(this.lastUiUpdate, 20)) { ... this.lastUiUpdate = system.currentTick; }
 * 
 * @param {number} lastUpdateTick - The system.currentTick when the action last ran.
 * @param {number} interval - Ticks to wait.
 * @returns {boolean}
 */
export function should_update(lastUpdateTick, interval) {
    return (system.currentTick - lastUpdateTick) >= interval;
}

/**
 * Linearly interpolates a value towards a target (e.g. for smooth animations or heat).
 * 
 * @param {number} current - Current value.
 * @param {number} target - Target value.
 * @param {number} speed - Amount to change per tick.
 * @param {number} dt - Delta time.
 * @returns {number} - The new value.
 */
export function move_towards(current, target, speed, dt) {
    const change = speed * dt;
    if (current < target) return Math.min(current + change, target);
    if (current > target) return Math.max(current - change, target);
    return current;
}

/**
 * Determines how many times a random event occurred over 'dt' ticks.
 * Useful for "chance per tick" logic (e.g. passive energy loss).
 * 
 * @param {number} chancePerTick - Probability (0.0 to 1.0).
 * @param {number} dt - Delta time.
 * @returns {number} - Count of successes.
 */
export function random_count(chancePerTick, dt) {
    let count = 0;
    // For very large dt, this could be approximated with Binomial distribution math,
    // but for typical machine ticks (<20), a loop is fast enough.
    for(let i = 0; i < dt; i++) {
        if(Math.random() < chancePerTick) count++;
    }
    return count;
}

/**
 * Returns true if a random event happened at least once over 'dt' ticks.
 * 
 * @param {number} chancePerTick - Probability (0.0 to 1.0).
 * @param {number} dt - Delta time.
 * @returns {boolean}
 */
export function check_chance(chancePerTick, dt) {
    if (dt <= 0) return false;
    // Probability of it not happening is (1 - p)^dt
    // Probability of happening at least once is 1 - (1 - p)^dt
    return Math.random() < (1 - Math.pow(1 - chancePerTick, dt));
}
