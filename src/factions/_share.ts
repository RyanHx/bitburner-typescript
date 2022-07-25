/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    while (true) {
        await ns.share();
    }
}