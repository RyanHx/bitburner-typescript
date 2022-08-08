/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const root = ns.run("/utils/root.js");
    while (ns.isRunning(root)) {
        await ns.sleep(200);
    }
    const max_weak_time = <number>ns.args[0] ?? 30;
    const target_col_pad = 20;
    const hack_col_pad = 15;
    const mon_col_pad = 13;
    const servers = (<string>ns.read("nuked.txt")).split(",");
    servers.sort((a, b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));
    ns.tprint("Target".padEnd(target_col_pad), "Hack chance".padEnd(hack_col_pad), "Max money");
    for (const target of servers) {
        const serv_obj = ns.getServer(target);
        serv_obj.hackDifficulty = serv_obj.minDifficulty;
        serv_obj.moneyAvailable = serv_obj.moneyMax;
        const noMoney = serv_obj.moneyAvailable <= 0;
        const unHackable = ns.getServerRequiredHackingLevel(target) > ns.getHackingLevel() * 0.3 || ns.formulas.hacking.weakenTime(serv_obj, ns.getPlayer()) > max_weak_time * 1000;
        if (noMoney || unHackable) continue;
        ns.tprint(target.padEnd(target_col_pad), ns.hackAnalyzeChance(target).toFixed(3).padEnd(hack_col_pad), ns.getServerMaxMoney(target).toLocaleString('en-GB').padStart(mon_col_pad));
    }
}