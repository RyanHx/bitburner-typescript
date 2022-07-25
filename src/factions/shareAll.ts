/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const root = ns.run("/utils/root.js");
    while (ns.isRunning(root) === true) {
        await ns.sleep(200);
    }
    for (const server of (<string>ns.read("nuked.txt")).split(",")) {
        if (ns.hasRootAccess(server) === true && ns.getServerMaxRam(server) > 0) {
            ns.killall(server, true);
            await ns.scp(["/factions/share.js", "/factions/_share.js"], server);
            ns.exec("/factions/share.js", server, 1, 1);
        }
    }
}