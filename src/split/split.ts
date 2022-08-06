/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const data = ns.flags([
        ['H', false], /* ignore home? */
        ['B', false] /* ignore servers running batch.js? */
    ]);
    const root_servers = (<string>ns.read("nuked.txt")).split(",");
    const target = data._[0] ? <string>data._[0] : "iron-gym";
    const ratios: Record<string, number> = {
        hack: 1,
        grow: 20,
        weak: 5,
        sum: 0
    }
    ratios.sum = ratios.hack + ratios.grow + ratios.weak;

    const server_thread_counts = getTotalNetworkThreads(ns, root_servers, data.B);
    const network_thread_pool = getThreadsFromRatio(ratios, <number>server_thread_counts.total);
    for (const server of root_servers) {
        if (data.B === true && isBatching(ns, server) === true) {
            continue;
        }
        const server_hgw = getServerThreadsFromPool(ns, network_thread_pool, server_thread_counts.servs[server]);
        await deploySplit(ns, server_hgw, server, target);
    }

    if (data.H === true) {
        return;
    }
    const home_ram_threshold = 0.9; // Change multiplier as needed
    let home_free_ram = ns.getServerMaxRam('home');
    for (const proc of ns.ps('home')) {
        if (proc.filename.startsWith('/split/')) {
            continue;
        }
        home_free_ram -= ns.getScriptRam(proc.filename, "home");
    }
    const total_home_threads = Math.floor((home_free_ram * home_ram_threshold) / 1.75);
    const ratioed_home_threads = getThreadsFromRatio(ratios, total_home_threads);
    await deploySplit(ns, ratioed_home_threads, "home", target, true);
}

export function autocomplete(data: AutocompleteData): string[] {
    return data.servers; // This script autocompletes the list of servers.
}

/**
 * Deploys H/G/W tasks on a host with given thread counts and target.
 * @param ns Netscript interface.
 * @param threads Object containing thread counts for each task.
 * @param host Server on which to run tasks.
 * @param target Server that tasks will target.
 * @param spawn Should final .exec call instead be a .spawn (terminating the current script)
 */
async function deploySplit(ns: NS, threads: Record<string, number>, host: string, target: string, spawn = false): Promise<void> {
    const files = {
        hack: "/split/hack.js",
        grow: "/split/grow.js",
        weak: "/split/weaken.js"
    }
    if (host === "home") {
        ns.scriptKill(files.hack, "home");
        ns.scriptKill(files.grow, "home");
        ns.scriptKill(files.weak, "home");
    } else {
        ns.killall(host);
    }

    if (threads.hack > 0) {
        await ns.scp(files.hack, host, "home");
        ns.exec(files.hack, host, threads.hack, target);
    }
    if (threads.weak > 0) {
        await ns.scp(files.weak, host, "home");
        ns.exec(files.weak, host, threads.weak, target);
    }
    if (threads.grow > 0) {
        await ns.scp(files.grow, host, "home");
        if (spawn === true) {
            ns.spawn(files.grow, threads.grow, target);
        }
        ns.exec(files.grow, host, threads.grow, target);
    }
}

/**
 * Split total thread count into given ratio.
 * @param ratios H:G:W ratio to split threads.
 * @param total_threads Total number of threads to split into ratio.
 * @returns Object containing thread counts as per provided ratio.
 */
function getThreadsFromRatio(ratios: Record<string, number>, total_threads: number) {
    const threads = {
        hack: Math.floor((ratios.hack / ratios.sum) * total_threads),
        grow: Math.floor((ratios.grow / ratios.sum) * total_threads),
        weak: Math.floor((ratios.weak / ratios.sum) * total_threads),
        total: 0
    }
    threads.total = threads.hack + threads.grow + threads.weak;
    if (threads.total !== total_threads) {
        const difference = total_threads - threads.total;
        threads.grow += difference;
        threads.total += difference;
    }
    return threads;
}

/**
 * Get thread capacity of all nuked servers.
 * @param ns Netscript interface.
 * @param root_servers List of servers that have root access.
 * @param ignore_batch_servs Avoid deploying on servers running batch.js?
 * @returns Object containing thread capacity for each server, as well as total thread capacity across all servers.
 */
function getTotalNetworkThreads(ns: NS, root_servers: string[], ignore_batch_servs: boolean) {
    const network_threads = {
        total: 0,
        servs: {} as Record<string, number>
    }

    for (const server of root_servers) {
        if (ignore_batch_servs === true && isBatching(ns, server) === true) {
            continue;
        }
        const maxram = ns.getServerMaxRam(server);
        const server_threads = Math.floor(maxram / 1.75); // h/g/w scripts = 1.75gb ram usage each
        network_threads.servs[server] = server_threads; // e.g. { "home" : 20 }
        network_threads.total += server_threads;
    }
    return network_threads;
}

/**
 * Subtracts maximum possible thread counts from ratioed thread pool for a given thread capacity and returns them.
 * @param {NS} ns Netscript interface.
 * @param {object} thread_pool Pre-ratioed thread counts to subtract from.
 * @param {number} total_server_threads Thread capacity of current server.
 * @returns {object} Total threads for each task.
 */
function getServerThreadsFromPool(ns: NS, thread_pool: Record<string, number>, total_server_threads: number) {
    const hgw_threads = {
        hack: 0,
        grow: 0,
        weak: 0
    }
    while (total_server_threads > 0) {
        let used_threads = 0;
        if (thread_pool.hack > 0) {
            used_threads = Math.min(total_server_threads, thread_pool.hack);
            hgw_threads.hack = used_threads
            thread_pool.hack -= used_threads;
        }
        else if (thread_pool.grow > 0) {
            used_threads = Math.min(total_server_threads, thread_pool.grow);
            hgw_threads.grow = used_threads
            thread_pool.grow -= used_threads;
        }
        else if (thread_pool.weak > 0) {
            used_threads = Math.min(total_server_threads, thread_pool.weak);
            hgw_threads.weak = used_threads
            thread_pool.weak -= used_threads;
        }
        thread_pool.total -= used_threads;
        total_server_threads -= used_threads;
    }
    return hgw_threads;
}

/**
 * Checks whether given server is running batch.js.
 * @param ns Netscript interface.
 * @param host Hostname of server to check running scripts.
 * @returns Is host running batch.js.
 */
function isBatching(ns: NS, host: string) {
    const proc_list = ns.ps(host);
    if (!proc_list || proc_list.length === 0) return false;
    for (const proc of proc_list) {
        if (proc.filename.startsWith("/batch/")) {
            return true;
        }
    }
    return false;
}