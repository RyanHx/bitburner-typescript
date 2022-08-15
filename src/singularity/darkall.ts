import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    const files = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "SQLInject.exe", "HTTPWorm.exe"];
    ns.singularity.purchaseTor();
    for (const file of files) {
        ns.singularity.purchaseProgram(file);
    }
    ns.spawn("/utils/root.js");
}