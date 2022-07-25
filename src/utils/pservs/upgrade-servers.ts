/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");
    const target_ram = <number>ns.args[0];
    const purchased_servs = ns.getPurchasedServers();
    let split_target = "";
    let maxed_servers = 0;
    const utils = [];
    for(const filename of ns.ls("home")){
        if(filename.startsWith("/utils/")){
            utils.push(filename);
        }
    }
    while (maxed_servers < purchased_servs.length) { // Loop till all servers maxed
        for (let i = 0; i < purchased_servs.length; i++) { // Foreach purchased server
            for (let ram = target_ram; ram > ns.getServerMaxRam(purchased_servs[i]); ram = ram / 2) { // Count back from largest ram
                if (ns.getServerMoneyAvailable('home') * 0.2 > ns.getPurchasedServerCost(ram)) {
                    for (const script of ns.ps(purchased_servs[i])) {
                        if (script.filename.startsWith("/split/")) {
                            split_target = <string>script.args[0];
                            break;
                        }
                    }
                    ns.killall(purchased_servs[i]);
                    while (ns.ps(purchased_servs[i]).length > 0) {
                        await ns.sleep(2000);
                    }
                    if (ns.deleteServer(purchased_servs[i]) === true) {
                        ns.purchaseServer(purchased_servs[i], ram);
                        if (ram == target_ram) {
                            maxed_servers++;
                        }
                        await ns.scp(utils, purchased_servs[i], "home");
                        await reset_hacks(ns, split_target);
                    }
                }
            }
        }
        await ns.sleep(1);
    }
}

async function reset_hacks(ns: NS, split_target: string): Promise<void> {
    ns.scriptKill("/split/hack.js", "home");
    ns.scriptKill("/split/grow.js", "home");
    ns.scriptKill("/split/weaken.js", "home");
    let rehack = ns.run("/utils/root.js");
    while (ns.isRunning(rehack) === true) {
        await ns.sleep(1000);
    }
    rehack = ns.run("/split/split.js", 1, split_target, "-H");
    while (ns.isRunning(rehack) === true) {
        await ns.sleep(500);
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: AutocompleteData, args: string[]): string[] {
    const values = [];
    for(let ram = 8; ram <= 524288; ram *= 2){
        values.push(ram.toString());
    }
    return values
}