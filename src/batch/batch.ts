/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    let target = "iron-gym";
    if (ns.args[0]) {
        target = <string>ns.args[0];
    }
    if (ns.getServer().hostname === "home") {
        ns.run("/utils/monitor.js", 1, target);
    }

    const data = ns.flags([
        ['s', false] // sequential batches
    ]);

    const prep = ns.run("/batch/prep2.js", 1, target);
    while (ns.isRunning(prep) === true) {
        await ns.sleep(1000);
    }

    const time_offset = 50;
    const hack_data = { current: Number(ns.args[1]) || 0.1, max: 1 }
    let currLevel = ns.getHackingLevel();
    let currRam = ns.getServer().maxRam;

    const threads = { h: 0, w1: 0, g: 0, w2: 0 };
    threads.h = Math.floor(ns.hackAnalyzeThreads(target, ns.getServer(target).moneyMax * hack_data.current));
    threads.w1 = Math.ceil(threads.h / 25);
    threads.g = Math.ceil(ns.growthAnalyze(target, 1 / (1 - hack_data.current), ns.getServer().cpuCores));
    threads.w2 = Math.ceil(threads.g / 12.5);

    let durations = calculateDuration(ns, target, time_offset);
    let last_batch_end = performance.now() - durations.total;
    let calibration_flag = false;
    let rand_token = 0;

    while (true) {
        ns.print(`Offsetting batch ${rand_token}`);
        while (performance.now() + durations.w - time_offset <= last_batch_end + 2000) {
            // next hack time <= last batch end + arbritrary offset
            // If we deployed a batch now the hack would fire before the previous batch finished			
            await ns.sleep(time_offset);
        }

        await checkMoneyInSync(ns, target, hack_data.current);

        // Recalibrate timings/threads
        if (ns.getHackingLevel() != currLevel || calibration_flag) {
            ns.print("Waiting for safe calibration");
            if (ns.getServer(target).moneyAvailable < ns.getServer(target).moneyMax) {
                // Server money currently not maxed (between hack and grow of a batch)
                await ns.sleep(time_offset * 3 + time_offset / 2); // end of batch + half offset
            }
            durations = calculateDuration(ns, target, time_offset);
            threads.h = Math.floor(ns.hackAnalyzeThreads(target, ns.getServer(target).moneyMax * hack_data.current));
            currLevel = ns.getHackingLevel();
            calibration_flag = false;
        }
        if (ns.getServer().maxRam > currRam) {
            hack_data.max = 1; // Reset maximum
            currRam = ns.getServer().maxRam;
        }

        threads.h = threads.h < 1 ? 1 : threads.h;
        threads.w1 = Math.ceil(threads.h / 25);
        const growth_multi = hack_data.current == 1 ? 2 : 1 / (1 - hack_data.current);
        threads.g = Math.ceil(ns.growthAnalyze(target, growth_multi, ns.getServer().cpuCores));
        threads.w2 = Math.ceil(threads.g / 12.5);

        if (await requiredRamTimeout(ns, threads, durations) === true) {
            ns.print("Timed out waiting for free RAM");
            if (hack_data.current >= 0.15) {
                hack_data.current = Math.round((hack_data.current - 0.05) * 100) / 100; // Plain subtraction was adding huge decimal places
                ns.print(`Decremented hack to ${hack_data.current * 100}%`);
            }
            continue;
        }

        if (hackDataChanged(ns, threads, hack_data) === true) {
            calibration_flag = true;
            continue;
        }

        ns.print(`Deploying ${hack_data.current * 100}% hack`);
        deploy(ns, threads, target, durations, time_offset, rand_token++);
        last_batch_end = performance.now() + durations.total;
        if (data.s === true) {
            await ns.sleep(durations.total + 500);
        }
    }
}

export function autocomplete(data: AutocompleteData): string[] {
    return data.servers; // This script autocompletes the list of servers.
}

/**
 * Deploys all batch scripts.
 * @param {NS} ns
 * @param {object} threads
 * @param {string} target
 * @param {object} durations
 * @param {number} time_offset
 * @param {number} rand_token
 */
function deploy(ns: NS, threads: Record<string, number>, target: string, durations: Record<string, number>, time_offset: number, rand_token: number): void {
    const h_threads = threads.h - Math.ceil(threads.h * 0.05); // Avoid blowing past hack target
    //ns.print(`Durations: ${JSON.stringify(durations)}`);
    ns.run("/batch/batch_h.js", h_threads || 1, target, durations.w - durations.h - time_offset, rand_token);
    ns.run("/batch/batch_w.js", threads.w1 || 1, target, 0, rand_token);
    ns.run("/batch/batch_g.js", threads.g || 1, target, durations.w - durations.g + time_offset, rand_token);
    ns.run("/batch/batch_w.js", threads.w2 || 1, target, time_offset * 2, rand_token);
}

function hackDataChanged(ns: NS, threads: Record<string, number>, hack_data: Record<string, number>): boolean {
    if (getTotalBatchRam(threads) < getFreeRam(ns) * 0.2) {
        const next_increment = Math.round((hack_data.current + 0.01) * 100) / 100; // Plain addition was adding huge decimal places
        let canIncrement = hack_data.current <= 0.89;
        canIncrement = canIncrement && next_increment <= hack_data.max;
        if (canIncrement === true) {
            hack_data.current = next_increment;
            ns.print(`Incremented hack to ${hack_data.current * 100}%`);
            return true;
        }
    } else if (hack_data.current >= 0.11) {
        hack_data.current = Math.round((hack_data.current - 0.01) * 100) / 100; // Plain subtraction was adding huge decimal places
        hack_data.max = hack_data.current;
        ns.print(`Decremented hack to ${hack_data.current * 100}%`);
        return true;
    }
    return false;
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {number} hack_percent
 */
async function checkMoneyInSync(ns: NS, target: string, hack_percent: number): Promise<void> {
    ns.print("Checking server money");
    const hack_thresh = hack_percent - hack_percent * 0.3;  // Lower aggressiveness of sync checks
    if (ns.getServer(target).moneyAvailable < Math.floor(ns.getServer(target).moneyMax * hack_thresh)) {
        // Money lower than intended hack percent, re-prepare server.
        const currHost = ns.getServer().hostname;
        ns.scriptKill("/batch/prep2.js", currHost);
        ns.scriptKill("/batch/batch_w.js", currHost);
        ns.scriptKill("/batch/batch_g.js", currHost);
        ns.scriptKill("/batch/batch_h.js", currHost);
        const prep = ns.run("/batch/prep2.js", 1, target);
        while (ns.isRunning(prep) === true) {
            await ns.sleep(1000);
        }
    }
}

/**
 * Calculates duration of batch and its respective tasks.
 * @param {NS} ns
 * @param {string} target Target's hostname.
 * @param {number} time_offset Time in ms between tasks.
 * @returns {object} Object containing task durations and total duration.
 */
function calculateDuration(ns: NS, target: string, time_offset: number): Record<string, number> {
    const h_time = Math.ceil(ns.getHackTime(target));
    const w_time = h_time * 4;
    const g_time = Math.ceil(h_time * 3.2);
    const t_time = Math.ceil(w_time + time_offset * 2);
    return { h: h_time, w: w_time, g: g_time, total: t_time };
}

/**
 * Total RAM usage for a given batch
 * @param {object} threads
 */
function getTotalBatchRam(threads: Record<string, number>): number {
    const gw_ram = 1.75; // Grow/weaken script ram
    const h_ram = 1.7; // Hack script ram
    let req_ram = threads.h * h_ram;
    req_ram += threads.g * gw_ram;
    req_ram += threads.w1 * gw_ram;
    req_ram += threads.w2 * gw_ram;
    return req_ram;
}

/**
 * Waits for free RAM up to timeout.
 * @param {NS} ns
 * @param {object} threads Object containing required threads.
 * @param {object} durations Object containing durations of all batch tasks.
 * @returns {Promise<boolean>} Whether timed out waiting for free RAM.
 */
async function requiredRamTimeout(ns: NS, threads: Record<string, number>, durations: Record<string, number>): Promise<boolean> {
    const req_ram = getTotalBatchRam(threads);
    let first_ram_alarm;
    let free_ram = ns.getServer().maxRam - ns.getServer().ramUsed;
    const ram_timeout = durations.total + 10000;
    ns.print(`Checking RAM up to ${Math.round(ram_timeout / 10) / 100} seconds`);
    while (free_ram < req_ram) {
        if (!first_ram_alarm) {
            first_ram_alarm = performance.now();
        } else if (performance.now() - first_ram_alarm > ram_timeout) {
            // Still not enough ram after timeout
            ns.print("No free ram after previous batch!");
            return true;
        }
        //ns.print(`Not enough ram (${free_ram} / ${req_ram})`);
        await ns.sleep(200);
        free_ram = ns.getServer().maxRam - ns.getServer().ramUsed;
    }
    return false;
}

/**
 * Get free RAM excluding current batches.
 * @param {NS} ns
 * @returns {number} Free RAM (GB)
 */
function getFreeRam(ns: NS): number {
    const host = ns.getServer().hostname;
    const batch_files = ["/batch/batch_g.js", "/batch/batch_h.js", "/batch/batch_w.js"];
    let used_ram = 0;
    for (const process of ns.ps(host)) {
        if (batch_files.includes(process.filename) === false) {
            used_ram += ns.getScriptRam(process.filename, host);
        }
    }
    return ns.getServer().maxRam - used_ram;
}