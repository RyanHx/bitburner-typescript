export class RatioHack {
    readonly #target: string;
    readonly #ratios: Record<string, number>;
    readonly #ignore_home: boolean;
    readonly #ignore_batch: boolean;
    readonly #files: Record<string, string>;
    readonly #rooted_servs: string[];
    constructor(ns: NS, target: string, hgw_ratio: number[], ignore_home: boolean, ignore_batch: boolean) {
        this.#files = {
            hack: "/split/hack.js",
            grow: "/split/grow.js",
            weak: "/split/weaken.js"
        }
        this.#rooted_servs = (<string>ns.read("nuked.txt")).split(",");
        this.#target = target;
        this.#ratios = {
            hack: hgw_ratio[0],
            grow: hgw_ratio[1],
            weak: hgw_ratio[2],
            sum: 0
        }
        this.#ratios.sum = hgw_ratio.reduce((total, current) => { return total + current }, 0)
        this.#ignore_home = ignore_home;
        this.#ignore_batch = ignore_batch;
    }

    async run(ns: NS): Promise<void> {
        const server_thread_counts = this.#getTotalNetworkThreads(ns);
        const network_thread_pool = this.#getThreadsFromRatio(<number>server_thread_counts.total);
        for (const server of this.#rooted_servs) {
            if (this.#ignore_batch === true && this.#isBatching(ns, server) === true) {
                continue;
            }
            const server_hgw = this.#getServerThreadsFromPool(ns, network_thread_pool, server_thread_counts.servs[server]);
            await this.#deploySplit(ns, server_hgw, server);
        }

        if (this.#ignore_home === true) {
            return;
        }
        const home_free_ram = this.#getFreeRam(ns, "home");
        const home_ram_threshold = 0.9; // Change multiplier as needed
        const total_home_threads = Math.floor((home_free_ram * home_ram_threshold) / 1.75);
        const ratioed_home_threads = this.#getThreadsFromRatio(total_home_threads);
        await this.#deploySplit(ns, ratioed_home_threads, "home", true);
    }

    /**
     * Get thread capacity of all nuked servers.
     * @param ns Netscript interface.
     * @returns Object containing thread capacity for each server, as well as total thread capacity across all servers.
     */
    #getTotalNetworkThreads(ns: NS): {
        total: number;
        servs: Record<string, number>;
    } {
        const network_threads = {
            total: 0,
            servs: {} as Record<string, number>
        }

        for (const server of this.#rooted_servs) {
            if (this.#ignore_batch === true && this.#isBatching(ns, server) === true) {
                continue;
            }
            const freeram = this.#getFreeRam(ns, server);
            const server_threads = Math.floor(freeram / 1.75); // h/g/w scripts = 1.75gb ram usage each
            network_threads.servs[server] = server_threads; // e.g. { "home" : 20 }
            network_threads.total += server_threads;
        }
        return network_threads;
    }

    /**
     * Deploys H/G/W tasks on a host with given thread counts and target.
     * @param ns Netscript interface.
     * @param threads Object containing thread counts for each task.
     * @param host Server on which to run tasks.
     * @param spawn Should final .exec call instead be a .spawn (terminating the current script)
     */
    async #deploySplit(ns: NS, threads: Record<string, number>, host: string, spawn = false): Promise<void> {
        ns.scriptKill(this.#files.hack, host);
        ns.scriptKill(this.#files.grow, host);
        ns.scriptKill(this.#files.weak, host);

        if (threads.hack > 0) {
            await ns.scp(this.#files.hack, host, "home");
            ns.exec(this.#files.hack, host, threads.hack, this.#target);
        }
        if (threads.weak > 0) {
            await ns.scp(this.#files.weak, host, "home");
            ns.exec(this.#files.weak, host, threads.weak, this.#target);
        }
        if (threads.grow > 0) {
            await ns.scp(this.#files.grow, host, "home");
            if (spawn === true) {
                ns.spawn(this.#files.grow, threads.grow, this.#target);
            }
            ns.exec(this.#files.grow, host, threads.grow, this.#target);
        }
    }

    /**
    * Split total thread count into defined ratio.
    * @param total_threads Total number of threads to split into ratio.
    * @returns Object containing thread counts as per provided ratio.
    */
    #getThreadsFromRatio(total_threads: number): {
        hack: number;
        grow: number;
        weak: number;
        total: number;
    } {
        const threads = {
            hack: Math.floor((this.#ratios.hack / this.#ratios.sum) * total_threads),
            grow: Math.floor((this.#ratios.grow / this.#ratios.sum) * total_threads),
            weak: Math.floor((this.#ratios.weak / this.#ratios.sum) * total_threads),
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
     * Subtracts maximum possible thread counts from ratioed thread pool for a given thread capacity and returns them.
     * @param {NS} ns Netscript interface.
     * @param {object} thread_pool Pre-ratioed thread counts to subtract from.
     * @param {number} total_server_threads Thread capacity of current server.
     * @returns {object} Total threads for each task.
     */
    #getServerThreadsFromPool(ns: NS, thread_pool: Record<string, number>, total_server_threads: number): {
        hack: number;
        grow: number;
        weak: number;
    } {
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
    #isBatching(ns: NS, host: string): boolean {
        const proc_list = ns.ps(host);
        if (!proc_list || proc_list.length === 0) return false;
        for (const proc of proc_list) {
            if (proc.filename.startsWith("/batch/")) {
                return true;
            }
        }
        return false;
    }

    /**
     * Gets free RAM, excluding split scripts as they will be killed.
     * @param ns Netscript interface
     * @param server host to check RAM
     * @returns Amount of free RAM ignoring existing split scripts (GB)
     */
    #getFreeRam(ns: NS, server: string): number {
        let freeram = ns.getServerMaxRam(server);
        for (const proc of ns.ps(server)) {
            if (proc.filename === this.#files.hack || proc.filename === this.#files.weak || proc.filename === this.#files.grow) continue;
            freeram -= ns.getScriptRam(proc.filename, server);
        }
        return freeram;
    }
}