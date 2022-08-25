import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const max_purchase_ram = ns.getPurchasedServerMaxRam();
    let ram = 8;
    const padding = 15;
    ns.tprint("Ram (GB)".padEnd(padding), "Cost ($)");
    while (ram != max_purchase_ram) {
        ns.tprint(`${ram}`.padEnd(padding), ns.getPurchasedServerCost(ram).toLocaleString('en-GB'));
        ram *= 2;
    }
}