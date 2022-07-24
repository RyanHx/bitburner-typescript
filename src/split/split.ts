/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    let target = "iron-gym";
    if (ns.args[0]) {
        target = <string>ns.args[0];
    }
    const hgw = [1, 30, 5]; // hack:grow:weaken ratio
    const data = ns.flags([
        ['H', false], /* ignore home? */
        ['B', false] /* ignore servers running batch.js? */
    ]);

    const root_servers = (<string>ns.read("nuked.txt")).split(",");
    const files = ["/split/hack.js", "/split/grow.js", "/split/weaken.js"];
    const maxServerThreads: Record<string, number> = {};
    let totalThreads = 0;

    for (let i = 0; i < root_servers.length; i++) {
        if (data.B && isBatching(ns, root_servers[i])) {
            continue;
        }
        const maxram = ns.getServerMaxRam(root_servers[i]);
        const server_threads = Math.floor(maxram / 1.75); // h/g/w scripts = 1.75gb ram usage each
        maxServerThreads[root_servers[i]] = server_threads; // e.g. { "home" : 20 }
        totalThreads += server_threads;
    }

    const ratio_sum = hgw[0] + hgw[1] + hgw[2];
    let total_hack_threads = Math.floor((hgw[0] / ratio_sum) * totalThreads);
    let total_grow_threads = Math.floor((hgw[1] / ratio_sum) * totalThreads);
    let total_weak_threads = Math.floor((hgw[2] / ratio_sum) * totalThreads);
    for (let i = 0; i < root_servers.length; i++) {
        if (data.B && isBatching(ns, root_servers[i])) {
            continue;
        }
        const current_hgw = [0, 0, 0];
        while (maxServerThreads[root_servers[i]] > 0) {
            if (total_hack_threads > 0) {
                total_hack_threads--;
                current_hgw[0]++;
            }
            else if (total_grow_threads > 0) {
                total_grow_threads--;
                current_hgw[1]++;
            }
            else if (total_weak_threads > 0) {
                total_weak_threads--;
                current_hgw[2]++;
            }
            maxServerThreads[root_servers[i]]--;
        }
        ns.killall(root_servers[i]);
        for (let x = 0; x < 3; x++) {
            // Refresh HGW files in case of changes (e.g. {stock} argument)
            ns.rm(files[x], root_servers[i]);
            await ns.scp(files[x], "home", root_servers[i]);
            // Run file with computed threads
            if (current_hgw[x] > 0) {
                ns.exec(files[x], root_servers[i], current_hgw[x], target);
            }
        }
    }

    // Fill leftover with grow.js
    for (let i = root_servers.length - 1; i >= 0; i--) {
        if (data.B && isBatching(ns, root_servers[i])) {
            continue;
        }
        let free_ram = ns.getServerMaxRam(root_servers[i]) - ns.getServerUsedRam(root_servers[i]);
        const grow_ram = ns.getScriptRam("/split/grow.js", root_servers[i])
        if (free_ram < grow_ram) {
            // If last server is filled correctly, no need to check rest of servers
            break;
        }
        else {
            ns.scriptKill("/split/grow.js", root_servers[i]);
            free_ram = ns.getServerMaxRam(root_servers[i]) - ns.getServerUsedRam(root_servers[i]);
            ns.exec("/split/grow.js", root_servers[i], Math.floor(free_ram / grow_ram), target);
        }
    }

    if (data.H) { return; }
    ns.scriptKill("/split/hack.js", "home");
    ns.scriptKill("/split/grow.js", "home");
    ns.scriptKill("/split/weaken.js", "home");
    let home_free_ram = (ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) + ns.getScriptRam("/split/split.js");
    home_free_ram *= 0.5; // Change as needed
    let max_home_threads = Math.floor(home_free_ram / 1.75);
    let total_home_h = Math.floor((hgw[0] / ratio_sum) * max_home_threads);
    let total_home_g = Math.floor((hgw[1] / ratio_sum) * max_home_threads);
    let total_home_w = Math.floor((hgw[2] / ratio_sum) * max_home_threads);
    const home_hgw = [0, 0, 0];
    while (max_home_threads > 0) {
        if (total_home_h > 0) {
            total_home_h--;
            home_hgw[0]++;
        }
        else if (total_home_g > 0) {
            total_home_g--;
            home_hgw[1]++;
        }
        else if (total_home_w > 0) {
            total_home_w--;
            home_hgw[2]++;
        }
        max_home_threads--;
    }
    for (let x = 0; x < 3; x++) {
        if (home_hgw[x] > 0) {
            if (x === 2) {
                ns.spawn(files[x], home_hgw[x], target);
            }
            ns.exec(files[x], "home", home_hgw[x], target);
        }
    }
}

export function autocomplete(data: AutocompleteData): string[] {
    return data.servers; // This script autocompletes the list of servers.
}

/** 
 * @param {NS} ns
 * @param {string} host
 */
function isBatching(ns: NS, host: string): boolean {
    const proc_list = ns.ps(host);
    if (!proc_list || proc_list.length === 0) return false;
    for (const proc of proc_list) {
        if (proc.filename === "/batch/batch.js") {
            return true;
        }
    }
    return false;
}