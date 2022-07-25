/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const sleep_time = <number>ns.args[1];
    await ns.sleep(sleep_time);
    await ns.weaken(<string>ns.args[0]);
}