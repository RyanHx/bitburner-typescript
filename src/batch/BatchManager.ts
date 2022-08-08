export class BatchManager {
    readonly target: string;
    private readonly batch_end_times: Record<number, number[]>;
    private readonly threads: Record<string, number>;
    private readonly durations: Record<string, number>;
    private readonly has_copied_files: string[];
    private readonly delays: Record<string, number>;
    private hack_percent: number;
    private rand_token: number;
    private synced: boolean;
    private sync_batch_count: number;

    constructor(ns: NS, target: string, hack_percent: number) {
        this.target = target;
        this.hack_percent = hack_percent;
        this.rand_token = 0;
        this.synced = true;
        this.sync_batch_count = 0;
        this.batch_end_times = {};
        this.delays = {
            h: 0,
            w1: 0,
            g: 0,
            w2: 0,
            depth: 0,
            period: 0
        }
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
            offset: 50
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
            if (ns.getHackingLevel() !== currLevel || calibration_flag === true) {
                this.calculateDurations(ns);
                this.calculateThreads(ns);
                this.calculateDelays();
                currLevel = ns.getHackingLevel();
                calibration_flag = false;
            }
            this.checkMoneyInSync(ns);
            const nuked = (<string>ns.read("nuked.txt")).split(",").concat(["home"]);
            const req_ram = this.getTotalBatchRam();
            //ns.print(`Looking for ${req_ram}GB free ram.`);
            let attempts = 0;
            while (attempts < 4) {
                for (const server of nuked) {
                    if (ns.getServerMaxRam(server) - ns.getServerUsedRam(server) > req_ram) {
                        if (!this.has_copied_files.includes(server)) {
                            await ns.scp(["/batch/batch_h.js", "/batch/batch_w.js", "/batch/batch_g.js"], server, "home");
                            this.has_copied_files.push(server);
                        }
                        //ns.print(`Deploying ${Math.round(this.hack_percent * 100)}% batch on ${server}.`);
                        await this.deploy(ns, server);
                        await ns.sleep(this.delays.period);
                        continue main;
                    }
                }
                attempts++;
                if (ns.getHackingLevel() !== currLevel) continue main;
            }
            //ns.print("Couldn't find free RAM.");
            if (this.hack_percent >= 0.15 && Object.values(this.batch_end_times)[0][0] > performance.now()) {
                this.hack_percent -= 0.05;
                calibration_flag = true;
                ns.print(`Decremented hack to ${Math.round(this.hack_percent * 100)}%`);
                if (Object.keys(this.batch_end_times).length > 0) await ns.sleep(this.durations.total + 1000);
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
        if (Object.keys(this.batch_end_times >= this.delays.depth)) return;
        const h_threads = this.threads.h - Math.ceil(this.threads.h * 0.03); // Avoid blowing past hack target
        if (this.synced || this.sync_batch_count > 2) {
            ns.exec("/batch/batch_h.js", host, h_threads || 1, this.target, this.delays.h, this.rand_token);
        } else {
            this.sync_batch_count++;
            setTimeout(() => {
                this.sync_batch_count--;
                if (this.sync_batch_count === 0) this.synced = true;
            }, this.durations.total + 50);
        }
        const start = performance.now() + this.durations.w - this.durations.offset;
        ns.exec("/batch/batch_w.js", host, this.threads.w1 || 1, this.target, this.delays.w1, this.rand_token);
        ns.exec("/batch/batch_g.js", host, this.threads.g || 1, this.target, this.delays.g, this.rand_token);
        ns.exec("/batch/batch_w.js", host, this.threads.w2 || 1, this.target, this.delays.w2, this.rand_token);
        const end = performance.now() + this.durations.total;
        this.batch_end_times[this.rand_token] = [start, end];
        const token = this.rand_token;
        setTimeout(() => {
            delete this.batch_end_times[token];
        }, this.durations.total);
        this.rand_token++;
    }

    private async avoidUnsafeDeploy(ns: NS) {
        if (Object.keys(this.batch_end_times).length === 0) return;
        while (Object.values(this.batch_end_times)[0][0] <= performance.now() && performance.now() <= Object.values(this.batch_end_times)[0][1]) {
            await ns.sleep(1);
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
        this.durations.w = ns.formulas.hacking.weakenTime(target_server, player);
        target_server.moneyAvailable -= target_server.moneyAvailable * this.hack_percent;
        this.durations.g = ns.formulas.hacking.growTime(target_server, player);
        this.durations.total = Math.ceil(this.durations.w + this.durations.offset * 2);
    }

    private calculateDelays() {
        let period, depth;
        const kW_max = Math.floor(1 + (this.durations.w - 4 * this.durations.offset) / (8 * this.durations.offset));
        schedule: for (let kW = kW_max; kW >= 1; --kW) {
            const t_min_W = (this.durations.w + 4 * this.durations.offset) / kW;
            const t_max_W = (this.durations.w - 4 * this.durations.offset) / (kW - 1);
            const kG_min = Math.ceil(Math.max((kW - 1) * 0.8, 1));
            const kG_max = Math.floor(1 + kW * 0.8);
            for (let kG = kG_max; kG >= kG_min; --kG) {
                const t_min_G = (this.durations.g + 3 * this.durations.offset) / kG
                const t_max_G = (this.durations.g - 3 * this.durations.offset) / (kG - 1);
                const kH_min = Math.ceil(Math.max((kW - 1) * 0.25, (kG - 1) * 0.3125, 1));
                const kH_max = Math.floor(Math.min(1 + kW * 0.25, 1 + kG * 0.3125));
                for (let kH = kH_max; kH >= kH_min; --kH) {
                    const t_min_H = (this.durations.h + 5 * this.durations.offset) / kH;
                    const t_max_H = (this.durations.h - 1 * this.durations.offset) / (kH - 1);
                    const t_min = Math.max(t_min_H, t_min_G, t_min_W);
                    const t_max = Math.min(t_max_H, t_max_G, t_max_W);
                    if (t_min <= t_max) {
                        period = t_min;
                        depth = kW;
                        break schedule;
                    }
                }
            }
        }
        this.delays.depth = depth;
        this.delays.period = period;
        this.delays.h = <number>depth * <number>period - 4 * this.durations.offset - this.durations.h;
        this.delays.w1 = <number>depth * <number>period - 3 * this.durations.offset - this.durations.w;
        this.delays.g = <number>depth * <number>period - 2 * this.durations.offset - this.durations.g;
        this.delays.w2 = <number>depth * <number>period - 1 * this.durations.offset - this.durations.w;
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
        const threshold = Math.floor(ns.getServerMaxMoney(this.target) * (1 - this.hack_percent) * 0.9);
        if (ns.getServerMoneyAvailable(this.target) < threshold) {
            ns.print("Server money out of sync.");
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
