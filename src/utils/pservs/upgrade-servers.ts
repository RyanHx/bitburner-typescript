import { copyUtils } from "/utils/copy-utils";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");
    const target_ram = <number>ns.args[0];
    const purchased_servs = ns.getPurchasedServers();
    let split_target = "";
    let maxed_servers = 0;
    
    while (maxed_servers < purchased_servs.length) { // Loop till all servers maxed
        for (const pserv of purchased_servs) {
            for (let ram = target_ram; ram > ns.getServerMaxRam(pserv); ram /= 2) { // Count back from largest ram
                if (ns.getServerMoneyAvailable('home') * 0.2 > ns.getPurchasedServerCost(ram)) {
                    split_target = getSplitTarget(ns, pserv);
                    ns.killall(pserv);
                    while (ns.ps(pserv).length > 0) {
                        await ns.sleep(2000);
                    }
                    if (ns.deleteServer(pserv) === true) {
                        ns.purchaseServer(pserv, ram);
                        if (ram == target_ram) {
                            maxed_servers++;
                        }
                        await copyUtils(ns, pserv);
                        await reset_hacks(ns, split_target);
                    }
                }
            }
        }
        await ns.sleep(1);
    }
}

function getSplitTarget(ns: NS, hostname: string): string {
    for (const script of ns.ps(hostname)) {
        if (script.filename.startsWith("/split/")) {
            return <string>script.args[0];
        }
    }
    return "";
}

async function reset_hacks(ns: NS, split_target: string): Promise<void> {
    ns.scriptKill("/split/hack.js", "home");
    ns.scriptKill("/split/grow.js", "home");
    ns.scriptKill("/split/weaken.js", "home");
    let rehack = ns.run("/utils/root.js");
    while (ns.isRunning(rehack) === true) {
        await ns.sleep(1000);
    }
    rehack = ns.run("/split/split.js", 1, split_target, "-H", "-B");
    while (ns.isRunning(rehack) === true) {
        await ns.sleep(500);
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: AutocompleteData, args: string[]): string[] {
    const values = [];
    for (let ram = 8; ram <= 524288; ram *= 2) {
        values.push(ram.toString());
    }
    return values
}