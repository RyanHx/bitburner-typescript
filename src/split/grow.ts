/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const target = <string>ns.args[0];
    while (true) {
        await ns.grow(target, { stock: true });
    }
}