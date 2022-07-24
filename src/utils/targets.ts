/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const root = ns.run("/utils/root.js");
    while (ns.isRunning(root)) {
        await ns.sleep(200);
    }

    const target_col_pad = 20;
    const hack_col_pad = 15;
    const mon_col_pad = 13;
    const servers = (<string>ns.read("nuked.txt")).split(",");
    servers.sort((a, b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));
    ns.tprint("Target".padEnd(target_col_pad), "Hack chance".padEnd(hack_col_pad), "Max money");
    for (const target of servers) {
        const noMoney = ns.getServerMaxMoney(target) <= 0;
        const unHackable = ns.getServerRequiredHackingLevel(target) > ns.getHackingLevel() * 0.3;
        if (noMoney || unHackable) continue
        ns.tprint(target.padEnd(target_col_pad), ns.hackAnalyzeChance(target).toFixed(3).padEnd(hack_col_pad), ns.getServerMaxMoney(target).toLocaleString('en-GB').padStart(mon_col_pad));
    }
}