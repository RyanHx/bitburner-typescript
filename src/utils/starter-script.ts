import { copyUtils } from "utils/copy-utils";
import { list_servers } from "utils/list_servers";
import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const data = ns.flags([
        ['st', "foodnstuff"], // Split target
        ['p', false], // Purchase servers?
        ['bt', 'n00dles'] // Batch target
    ]);
    // Start auto server purchase script
    if (data.p === true) {
        ns.exec("/utils/pservs/purchase-servers.js", "home", 1);
    }

    // Root all available servers
    const root_pid = ns.exec("/utils/root.js", "home", 1);
    while (ns.isRunning(root_pid) === true) {
        await ns.sleep(50);
    }

    for (const server of list_servers(ns)) {
        await copyUtils(ns, server);
    }
    ns.run("/split/split.js", 1, data.st, "-H");
    ns.spawn("/batch/DistBatch.js", 1, data.bt, 0.1);
    //ns.run("auto-batch.js", 1, "--st", data.st);
}