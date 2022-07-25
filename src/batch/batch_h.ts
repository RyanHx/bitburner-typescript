/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    await ns.sleep(<number>ns.args[1]);
    await ns.hack(<string>ns.args[0]);
}