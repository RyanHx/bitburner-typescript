/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    let rooted: string[] = [];
    const scanned: string[] = ["home"];
    const toScan: string[] = [];
    toScan.push(...ns.scan("home"));
    while (toScan.length > 0) {
        const target = <string>toScan.pop();
        if (ns.fileExists("BruteSSH.exe")) {
            ns.brutessh(target);
        }
        if (ns.fileExists("FTPCrack.exe")) {
            ns.ftpcrack(target);
        }
        if (ns.fileExists("relaySMTP.exe")) {
            ns.relaysmtp(target);
        }
        if (ns.fileExists("SQLInject.exe")) {
            ns.sqlinject(target);
        }
        if (ns.fileExists("HTTPWorm.exe")) {
            ns.httpworm(target);
        }
        try {
            ns.nuke(target); // Will throw error if not enough ports
            rooted.push(target);
        }
        catch (error) { /* Not enough ports opened, ignore target */ }
        const newTargets = ns.scan(target);
        scanned.push(target);
        newTargets.forEach(new_target => {
            if (!scanned.includes(new_target) && !toScan.includes(new_target)) {
                toScan.push(new_target);
            }
        })
    }

    const pservs = ns.getPurchasedServers();
    pservs.forEach(pserv => {
        if (!rooted.includes(pserv)) {
            rooted.push(pserv);
        }
    });
    rooted = rooted.filter(item => !["home"].includes(item));
    await ns.write("nuked.txt", rooted, "w");
}