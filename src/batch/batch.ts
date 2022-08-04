/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const data = ns.flags([
        ['s', false] // sequential batches
    ]);
    const target = data._[0] ? <string>data._[0] : "iron-gym";
    const hack_data = {
        current: data._[1] ? <number>data._[1] : 0.1,
        max: 0.95,
        min: 0.05
    }
    if (ns.getHostname() === "home") {
        ns.run("/utils/monitor.js", 1, target);
    }

    const prep = ns.run("/batch/prep2.js", 1, target);
    while (ns.isRunning(prep) === true) {
        await ns.sleep(1000);
    }

    const threads = {
        h: 0,
        w1: 0,
        g: 0,
        w2: 0
    };
    const durations = {
        h: 0,
        w: 0,
        g: 0,
        total: 0,
        offset: 150
    }
    let last_batch_end = performance.now();
    let rand_token = 0;
    let currLevel = ns.getHackingLevel();
    const currHost = ns.getHostname();
    let currRam = ns.getServerMaxRam(currHost);
    let calibration_flag = true;

    while (true) {
        await checkMoneyInSync(ns, target, hack_data.current);

        // Recalibrate timings/threads
        if (ns.getHackingLevel() != currLevel || calibration_flag === true) {
            if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)) {
                // Server money currently not maxed (between hack and grow of a batch)
                ns.print("Waiting for safe calibration");
                await ns.sleep(durations.offset * 3 + durations.offset / 2); // end of batch + half offset
            }
            calculateDurations(ns, target, durations);
            threads.h = Math.floor(ns.hackAnalyzeThreads(target, ns.getServerMaxMoney(target) * hack_data.current));
            threads.h = threads.h < 1 ? 1 : threads.h;
            threads.w1 = Math.ceil(threads.h / 25);
            const growth_multi = hack_data.current == 1 ? 2 : 1 / (1 - hack_data.current);
            threads.g = Math.ceil(ns.growthAnalyze(target, growth_multi/*, ns.getServer().cpuCores*/));
            threads.w2 = Math.ceil(threads.g / 12.5);
            currLevel = ns.getHackingLevel();
            calibration_flag = false;
        }

        if (ns.getServerMaxRam(currHost) > currRam) {
            hack_data.max = 0.95; // Reset maximum
            currRam = ns.getServerMaxRam(currHost);
        }

        if (await requiredRamTimeout(ns, threads, durations) === true) {
            ns.print("Timed out waiting for free RAM");
            adjustHackPercent(ns, hack_data, -0.01);
            continue;
        }

        if (hackNeededChange(ns, threads, hack_data) === true) {
            calibration_flag = true;
            continue;
        }

        ns.print(`Offsetting batch ${rand_token}`);
        while (performance.now() + durations.w - durations.offset <= last_batch_end + 3000) {
            // next hack time <= last batch end + arbritrary offset
            // If we deployed a batch now the hack would fire before the previous batch finished			
            await ns.sleep(durations.offset);
        }
        ns.print(`Deploying ${hack_data.current * 100}% hack`);
        ns.print("--------------------");
        deploy(ns, target, threads, durations, rand_token++);
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
 * @param {number} rand_token
 */
function deploy(ns: NS, target: string, threads: Record<string, number>, durations: Record<string, number>, rand_token: number): void {
    const h_threads = threads.h - Math.ceil(threads.h * 0.03); // Avoid blowing past hack target
    //ns.print(`Durations: ${JSON.stringify(durations)}`);
    ns.run("/batch/batch_h.js", h_threads || 1, target, durations.w - durations.h - durations.offset, rand_token);
    ns.run("/batch/batch_w.js", threads.w1 || 1, target, 0, rand_token);
    ns.run("/batch/batch_g.js", threads.g || 1, target, durations.w - durations.g + durations.offset, rand_token);
    ns.run("/batch/batch_w.js", threads.w2 || 1, target, durations.offset * 2, rand_token);
}

function adjustHackPercent(ns: NS, hack_data: Record<string, number>, adjustment: number) {
    const start = hack_data.current;
    const requested_change = Math.round((hack_data.current + adjustment) * 100) / 100;
    if (hack_data.min <= requested_change && requested_change <= hack_data.max) {
        hack_data.current = requested_change
        const prefix = requested_change > start ? "Inc" : "Dec"
        ns.print(`${prefix}remented hack to ${hack_data.current * 100}%`);
        return true;
    }
    return false;
}

function hackNeededChange(ns: NS, threads: Record<string, number>, hack_data: Record<string, number>): boolean {
    let changed = false;
    if (getTotalBatchRam(threads) < getFreeRam(ns) * 0.2) {
        changed = adjustHackPercent(ns, hack_data, 0.01);
    } else {
        changed = adjustHackPercent(ns, hack_data, -0.01);
        hack_data.max = hack_data.current;
    }
    return changed;
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {number} hack_percent
 */
async function checkMoneyInSync(ns: NS, target: string, hack_percent: number): Promise<void> {
    const hack_thresh = (1 - hack_percent) * 0.5;  // Lower aggressiveness of sync checks
    if (ns.getServerMoneyAvailable(target) < Math.floor(ns.getServerMaxMoney(target) * hack_thresh)) {
        // Money lower than intended hack percent, re-prepare server.
        ns.print("Server money out of sync, reprepping");
        const currHost = ns.getHostname();
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
 * @param {object} durations Object containing durations of each task and task offset.
 */
function calculateDurations(ns: NS, target: string, durations: Record<string, number>) {
    const target_server = ns.getServer(target);
    const player = ns.getPlayer();
    target_server.hackDifficulty = target_server.minDifficulty;
    target_server.moneyAvailable = target_server.moneyMax;
    durations.h = ns.formulas.hacking.hackTime(target_server, player);
    durations.w = ns.formulas.hacking.weakenTime(target_server, player);
    durations.g = ns.formulas.hacking.growTime(target_server, player);
    durations.total = Math.ceil(durations.w + durations.offset * 2);
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
    const currHost = ns.getHostname();
    let first_ram_alarm;
    let free_ram = ns.getServerMaxRam(currHost) - ns.getServerUsedRam(currHost);
    const ram_timeout = durations.total + 10000;
    while (free_ram < req_ram) {
        if (!first_ram_alarm) {
            ns.print(`Waiting for ${req_ram}GB RAM (${Math.round(ram_timeout / 10) / 100}s)`);
            first_ram_alarm = performance.now();
        } else if (performance.now() - first_ram_alarm > ram_timeout) {
            // Still not enough ram after timeout            
            return true;
        }
        //ns.print(`Not enough ram (${free_ram} / ${req_ram})`);
        await ns.sleep(200);
        free_ram = ns.getServerMaxRam(currHost) - ns.getServerUsedRam(currHost);
    }
    return false;
}

/**
 * Get free RAM excluding current batches.
 * @param {NS} ns
 * @returns {number} Free RAM (GB)
 */
function getFreeRam(ns: NS): number {
    const host = ns.getHostname();
    const batch_files = ["/batch/batch_g.js", "/batch/batch_h.js", "/batch/batch_w.js"];
    let used_ram = 0;
    for (const process of ns.ps(host)) {
        if (batch_files.includes(process.filename) === false) {
            used_ram += ns.getScriptRam(process.filename, host);
        }
    }
    return ns.getServerMaxRam(host) - used_ram;
}