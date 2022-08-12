import { NS } from '@ns'
import { GangManager } from '/gang/manager';

export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    while (!ns.gang.inGang()) {
        ns.print("Not in gang. Sleeping.");
        await ns.sleep(10e3);
    }
    const manager = new GangManager(ns);
    while (true) {
        await manager.process(ns);
        await ns.sleep(1e3);
    }
}