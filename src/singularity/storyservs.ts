import { NS } from '@ns'
import { getServerConnRoute } from '/utils/locate';

export async function main(ns: NS): Promise<void> {
    const data = ns.flags([['f', false]]);
    const root = ns.run("/utils/root.js");
    while (ns.isRunning(root)) await ns.sleep(50);
    const servs = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"];
    for (const serv of servs) {
        for (const step of getServerConnRoute(ns, serv)) {
            ns.singularity.connect(step);
        }
        try {
            ns.tprint(`Installing backdoor on ${serv}.`);
            await ns.singularity.installBackdoor();
        } catch { ns.tprint("Failed.") }
    }
    ns.singularity.connect("home");
    ns.tprint("Story servs backdoor attempts finished.");
    if (<boolean>data.f === true) ns.spawn("/singularity/storyfactions.js");
}