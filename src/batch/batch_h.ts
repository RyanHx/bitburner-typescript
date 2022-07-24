/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const sleep_time = <number>ns.args[1];
    if (sleep_time > 0) {
        const start = performance.now();
        while (performance.now() <= start + sleep_time) {
            await ns.sleep(1);
        }
    }
    await ns.hack(<string>ns.args[0]);
}