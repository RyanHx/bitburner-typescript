export class BatchManager {
    readonly target: string;
    private readonly batch_end_times: Record<number, number[]>;
    private readonly threads: Record<string, number>;
    private readonly durations: Record<string, number>;
    private readonly has_copied_files: string[];
    private hack_percent: number;
    private max_hack_percent: number;
    private rand_token: number;
    private synced: boolean;
    private sync_batch_count: number;

    constructor(ns: NS, target: string) {
        this.target = target;
        this.max_hack_percent = 0.9;
        this.hack_percent = this.max_hack_percent;
        this.rand_token = 0;
        this.synced = true;
        this.sync_batch_count = 0;
        this.batch_end_times = {};
        this.has_copied_files = ["home"];
        this.threads = {
            h: 0,
            w1: 0,
            g: 0,
            w2: 0
        };
        this.durations = {
            h: 0,
            w: 0,
            g: 0,
            w2: 0,
            total: 0,
            offset: 150
        }
        if (ns.getHostname() === "home") {
            ns.run("/utils/monitor.js", 1, target);
        }
    }

    async run(ns: NS): Promise<void> {
        await this.prep(ns);
        let calibration_flag = true;
        let currLevel = ns.getHackingLevel();
        main: while (true) {
            const nuked = (<string>ns.read("nuked.txt")).split(",").concat(["home"]);
            if (ns.getHackingLevel() !== currLevel || calibration_flag === true) {
                this.calculateDurations(ns);
                this.calculateThreads(ns);
                currLevel = ns.getHackingLevel();
                calibration_flag = false;
            }
            this.checkMoneyInSync(ns);
            let attempts = 0;
            while (attempts < 4) {
                const req_ram = this.getTotalBatchRam();
                ns.print(`Looking for ${req_ram}GB free ram.`);
                for (const server of nuked) {
                    if (ns.getServerMaxRam(server) - ns.getServerUsedRam(server) > req_ram) {
                        if (!this.has_copied_files.includes(server)) {
                            await ns.scp(["/batch/batch_h.js", "/batch/batch_w.js", "/batch/batch_g.js"], server, "home");
                            this.has_copied_files.push(server);
                        }
                        ns.print(`Deploying ${Math.round(this.hack_percent * 100)}% hack on ${server}.`);
                        await this.deploy(ns, server);
                        continue main;
                    }
                }
                ns.print(`Couldn't find free RAM on attempt ${attempts}`);
                attempts++;
                if (ns.getHackingLevel() !== currLevel) continue main;
            }
            if (this.hack_percent >= 0.11 && Object.keys(this.batch_end_times).length < 5) {
                this.hack_percent -= 0.01;
                calibration_flag = true;
            }
            await ns.sleep(1);
        }
    }

    private async prep(ns: NS) {
        const prep = ns.run("/batch/prep2.js", 1, this.target);
        while (ns.isRunning(prep) === true) {
            await ns.sleep(1000);
        }
    }

    /**
     * Deploys all batch scripts.
     * @param {NS} ns
     */
    private async deploy(ns: NS, host: string): Promise<void> {
        const h_threads = this.threads.h - Math.ceil(this.threads.h * 0.03); // Avoid blowing past hack target
        if (this.synced || this.sync_batch_count > 2) {
            ns.exec("/batch/batch_h.js", host, h_threads || 1, this.target, this.durations.w - this.durations.h - this.durations.offset, this.rand_token);
        } else {
            this.sync_batch_count++;
            setTimeout(() => {
                this.sync_batch_count--;
                if (this.sync_batch_count === 0) this.synced = true;
            }, this.durations.total + 50);
        }
        const start = performance.now() + (this.durations.w - this.durations.h - this.durations.offset);
        ns.exec("/batch/batch_w.js", host, this.threads.w1 || 1, this.target, 0, this.rand_token);
        //await this.avoidUnsafeGrow(ns);
        ns.exec("/batch/batch_g.js", host, this.threads.g || 1, this.target, (this.durations.w - this.durations.g) + this.durations.offset, this.rand_token);
        ns.exec("/batch/batch_w.js", host, this.threads.w2 || 1, this.target, this.durations.total - this.durations.w2, this.rand_token);
        const end = performance.now() + this.durations.total;
        this.batch_end_times[this.rand_token] = [start, end];
        const token = this.rand_token;
        setTimeout(() => {
            delete this.batch_end_times[token];
        }, this.durations.total);
        this.rand_token++;
        await ns.sleep(500);
    }

    private async avoidUnsafeGrow(ns: NS) {
        let grow_start = performance.now() + (this.durations.w - this.durations.g + this.durations.offset);
        while (Object.values(this.batch_end_times).some(start_end => start_end[0] <= grow_start && grow_start <= start_end[1])) {
            await ns.sleep(1);
            grow_start = performance.now() + (this.durations.w - this.durations.g + this.durations.offset);
        }
    }

    /**
     * Calculates duration of batch and its respective tasks.
     * @param {NS} ns
     */
    private calculateDurations(ns: NS) {
        const target_server = ns.getServer(this.target);
        const player = ns.getPlayer();
        target_server.hackDifficulty = target_server.minDifficulty;
        target_server.moneyAvailable = target_server.moneyMax;
        this.durations.h = ns.formulas.hacking.hackTime(target_server, player);
        target_server.hackDifficulty += this.threads.h * 0.002;
        this.durations.w = ns.formulas.hacking.weakenTime(target_server, player);
        target_server.hackDifficulty = target_server.minDifficulty;
        target_server.moneyAvailable -= target_server.moneyAvailable * this.hack_percent;
        this.durations.g = ns.formulas.hacking.growTime(target_server, player);
        target_server.hackDifficulty += this.threads.g * 0.002;
        target_server.moneyAvailable = target_server.moneyMax;
        this.durations.w2 = ns.formulas.hacking.weakenTime(target_server, player);
        this.durations.total = Math.ceil(this.durations.w + this.durations.offset * 2);
    }

    private calculateThreads(ns: NS) {
        const target_server = ns.getServer(this.target);
        const player = ns.getPlayer();
        target_server.moneyAvailable = target_server.moneyMax;
        target_server.hackDifficulty = target_server.minDifficulty;
        this.threads.h = Math.floor(this.hack_percent / ns.formulas.hacking.hackPercent(target_server, player));
        this.threads.h = this.threads.h < 1 ? 1 : this.threads.h;
        this.threads.w1 = Math.ceil(this.threads.h / 25);
        target_server.moneyAvailable -= target_server.moneyAvailable * this.hack_percent;
        this.threads.g = Math.ceil(ns.growthAnalyze(this.target, target_server.moneyMax / target_server.moneyAvailable));
        this.threads.w2 = Math.ceil(this.threads.g / 12.5);
    }

    private getTotalBatchRam(): number {
        const gw_ram = 1.75; // Grow/weaken script ram
        const h_ram = 1.7; // Hack script ram
        let req_ram = this.threads.h * h_ram;
        req_ram += this.threads.g * gw_ram;
        req_ram += this.threads.w1 * gw_ram;
        req_ram += this.threads.w2 * gw_ram;
        return req_ram;
    }

    private checkMoneyInSync(ns: NS): void {
        const hack_thresh = (1 - this.hack_percent) * 0.5;
        if (ns.getServerMoneyAvailable(this.target) < Math.floor(ns.getServerMaxMoney(this.target) * hack_thresh)) {
            ns.print("Server money out of sync, reprepping");
            this.synced = false;
        }
    }
}

// /**
//  * Waits for free RAM up to timeout.
//  * @param {NS} ns
//  * @param {object} threads Object containing required threads.
//  * @param {object} durations Object containing durations of all batch tasks.
//  * @returns {Promise<boolean>} Whether timed out waiting for free RAM.
//  */
// async function requiredRamTimeout(ns: NS, threads: Record<string, number>, durations: Record<string, number>): Promise<boolean> {
//     const req_ram = getTotalBatchRam(threads);
//     const currHost = ns.getHostname();
//     let first_ram_alarm;
//     let free_ram = ns.getServerMaxRam(currHost) - ns.getServerUsedRam(currHost);
//     const ram_timeout = durations.total + 10000;
//     while (free_ram < req_ram) {
//         if (!first_ram_alarm) {
//             ns.print(`Waiting for ${req_ram}GB RAM (${Math.round(ram_timeout / 10) / 100}s)`);
//             first_ram_alarm = performance.now();
//         } else if (performance.now() - first_ram_alarm > ram_timeout) {
//             // Still not enough ram after timeout
//             return true;
//         }
//         //ns.print(`Not enough ram (${free_ram} / ${req_ram})`);
//         await ns.sleep(200);
//         free_ram = ns.getServerMaxRam(currHost) - ns.getServerUsedRam(currHost);
//     }
//     return false;
// }
