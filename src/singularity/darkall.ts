import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    const files = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "SQLInject.exe", "HTTPWorm.exe"];
    ns.singularity.purchaseTor();
    for (const file of files) {
        ns.singularity.purchaseProgram(file);
    }
    const root = ns.run("/utils/root.js");
    while (ns.isRunning(root)) await ns.sleep(50);
    ns.tprint("Darkall finished.");
}