import { numCycleForGrowthCorrected } from "/batch/growFromMoney.js"

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    ns.enableLog("exec");
    ns.enableLog("run");
    let target = "iron-gym";
    if (ns.args[0]) {
        target = <string>ns.args[0];
    }
    const root = ns.run("/utils/root.js", 1, target);
    while (ns.isRunning(root)) {
        await ns.sleep(500);
    }
    const time_offset = 200;
    const script_ram = 1.75;
    const serv_max_money = ns.getServerMaxMoney(target);
    const serv_min_sec = ns.getServerMinSecurityLevel(target);
    let currLevel = ns.getHackingLevel();
    let durations = calculateDuration(ns, target, time_offset);
    let h_threads = Math.floor(ns.hackAnalyzeThreads(target, serv_max_money));
    let w1_threads = Math.ceil(h_threads / 25);
    let g_threads = numCycleForGrowthCorrected(ns.getServer(target), serv_max_money, ns.getServerMoneyAvailable(target), ns.getPlayer(), ns.getServer().cpuCores);
    let w2_threads = Math.ceil(g_threads / 12.5);
    let rand_token = 0;
    let last_batch_end = performance.now();
    let shouldBatch = ns.getServerSecurityLevel(target) > serv_min_sec || ns.getServerMoneyAvailable(target) < serv_max_money;
    while (shouldBatch) {
        if (ns.getHackingLevel() != currLevel) {
            durations = calculateDuration(ns, target, time_offset);
            h_threads = Math.floor(ns.hackAnalyzeThreads(target, serv_max_money));
            currLevel = ns.getHackingLevel();
        }
        w1_threads = Math.ceil((ns.getServerSecurityLevel(target) - serv_min_sec) * 20);
        g_threads = numCycleForGrowthCorrected(ns.getServer(target), serv_max_money, ns.getServerMoneyAvailable(target), ns.getPlayer(), ns.getServer().cpuCores);
        w2_threads = Math.ceil(g_threads / 12.5);
        const avail_threads = Math.floor(getFreeRam(ns) / script_ram);
        const req_threads = g_threads + w1_threads + w2_threads;
        if (avail_threads >= req_threads) {
            ns.run("/batch/batch_w.js", w1_threads || 1, target, 0, rand_token);
            ns.run("/batch/batch_g.js", g_threads || 1, target, durations.w - durations.g + time_offset, rand_token);
            ns.run("/batch/batch_w.js", w2_threads || 1, target, time_offset * 2, rand_token);
            last_batch_end = performance.now() + durations.total;
        } else if (w1_threads > 0 && avail_threads > 0) {
            ns.run("/batch/batch_w.js", Math.min(w1_threads, avail_threads), target, 0, rand_token);
            last_batch_end = performance.now() + durations.w;
        } else if (g_threads > 0 && avail_threads > 0) {
            ns.run("/batch/batch_g.js", Math.min(g_threads, avail_threads), target, 0, rand_token);
            last_batch_end = performance.now() + durations.g;
        } else if (w2_threads > 0 && avail_threads > 0) {
            ns.run("/batch/batch_w.js", Math.min(w2_threads, avail_threads), target, 0, rand_token);
            last_batch_end = performance.now() + durations.w;
        }
        rand_token++;
        last_batch_end = performance.now() + durations.total;
        await ns.sleep((last_batch_end - performance.now()) + 2000);
        shouldBatch = ns.getServerSecurityLevel(target) > serv_min_sec || ns.getServerMoneyAvailable(target) < serv_max_money;
    }
}

export function autocomplete(data: AutocompleteData): string[] {
    return data.servers; // This script autocompletes the list of servers.
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
    return { h: h_time, w: w_time, g: g_time, total: t_time }
}

/**
 * Calculates free RAM on current server.
 * @param {NS} ns
 * @returns {number} Free RAM (GB).
 */
function getFreeRam(ns: NS): number {
    const host = ns.getHostname();
    return ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
}