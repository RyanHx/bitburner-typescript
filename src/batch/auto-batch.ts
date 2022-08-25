import { NS, ScriptArg, AutocompleteData } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    ns.tail();
    const data = ns.flags([
        ['st', 'foodnstuff'], // Split hack target
        ['wt', 30] // Weaken time
    ]);

    const root = ns.run("/utils/root.js");
    while (ns.isRunning(root) === true) {
        await ns.sleep(200);
    }

    const targets = getValidTargets(ns, data);
    const req_files = [
        "/batch/batch.js",
        "/batch/batch_h.js",
        "/batch/batch_g.js",
        "/batch/batch_w.js",
        "/batch/prep2.js",
        "/batch/growFromMoney.js"
    ];
    if (targets.length === 0) {
        ns.print("No targets found.");
    } else {
        // Start batch on home
        ns.print("Batching on home");
        killExistingBatch(ns, "home", req_files);
        ns.exec("/batch/batch.js", "home", 1, <string>targets.shift());

        // Start batch on purchased servers
        const pservs = ns.getPurchasedServers();
        while (pservs.length > 0 && targets.length > 0) {
            const pserv = ns.getServer(pservs.shift());
            ns.print(`Found ${pserv.hostname}`);
            if (pserv.maxRam < 1024) {
                ns.print("Not enough RAM");
                continue;
            }
            const target = <string>targets.shift();
            ns.print(`Target: ${target}`);
            ns.killall(pserv.hostname, true);
            await ns.scp(req_files, pserv.hostname, "home");
            ns.print("Deploying batch");
            ns.exec("/batch/batch.js", pserv.hostname, 1, target, 0.5);
        }
    }
    const split_target = targets.length > 0 ? <string>targets.shift() : <string>data.st;
    ns.print("Running split");
    ns.run("/split/split.js", 1, split_target, "-H", "-B");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: AutocompleteData, args: string[]): string[] {
    return [...data.servers]
}

/**
 * @param {NS} ns
 * @param {string} target
 */
function killExistingBatch(ns: NS, target: string, req_files: string[]): void {
    for (const filename of req_files) {
        ns.scriptKill(filename, target);
    }
}

/**
 * @param {NS} ns
 */
function getValidTargets(ns: NS, data: { [key: string]: ScriptArg }): string[] {
    const nuked_servers = (<string>ns.read("nuked.txt")).split(",");
    nuked_servers.sort((a: string, b: string) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));
    const targets = [];
    for (const target of nuked_servers) {
        if (target === "home" || /* target === home_target ||*/target === data.st) continue;
        const noMoney = ns.getServerMaxMoney(target) <= 0;
        let unHackable = ns.getServerRequiredHackingLevel(target) > ns.getHackingLevel() * 0.3;
        unHackable = unHackable || ns.formulas.hacking.weakenTime(ns.getServer(target), ns.getPlayer()) > <number>data.wt * 1000;
        unHackable = unHackable || ns.hackAnalyzeChance(target) < 1;
        if (noMoney || unHackable) continue;
        targets.push(target);
    }
    return targets;
}

function checkTarget(ns: NS, target: string) {
    const threads = {
        h: 0,
        w1: 0,
        g: 0,
        w2: 0
    };
    const target_server = ns.getServer(target);
    const this_server = ns.getServer();
    target_server.hackDifficulty = target_server.minDifficulty;
    target_server.moneyAvailable = target_server.moneyMax;
    const single_hack = ns.formulas.hacking.hackPercent(target_server, ns.getPlayer());
    if (single_hack >= 0.95) threads.h = 1;
    else {
        threads.h = Math.floor(0.95 / single_hack);
        const hacked = ns.formulas.hacking.growPercent(target_server, 1, ns.getPlayer());
    }
    threads.w1 = Math.ceil(threads.h / 25);
    const ram_allowance = getFreeRam(ns) * 0.2;
    const ram_cost = 0;
    while (ram_cost > ram_allowance) {
        //
    }
}

// const growth_multi = hack_data.current == 1 ? 2 : 1 / (1 - hack_data.current);
// threads.g = Math.ceil(ns.growthAnalyze(target, growth_multi/*, ns.getServer().cpuCores*/));
// threads.w2 = Math.ceil(threads.g / 12.5);

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