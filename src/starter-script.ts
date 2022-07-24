/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const data = ns.flags([
        ['st', "foodnstuff"], // Split target
        ['p', false], // Purchase servers?
        ['bt', 'n00dles'] // Batch target
    ]);
    // Start auto server purchase script
    if (data.p) {
        ns.exec("purchase-server-8gb.js", "home", 1);
    }

    // Root all available servers
    const root_pid = ns.exec("/utils/root.js", "home", 1);
    while (ns.isRunning(root_pid)) {
        await ns.sleep(50);
    }

    ns.run("/split/split.js", 1, data.st, "-H");
    ns.spawn("/batch/batch.js", 1, data.bt, 0.1);
    //ns.run("auto-batch.js", 1, "--st", data.st);
}