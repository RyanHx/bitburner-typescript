import { RatioHack } from "/split/RatioHGW";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const data = ns.flags([
        ['H', false], /* ignore home? */
        ['B', false] /* ignore servers running batch.js? */
    ]);
    const deployer = new RatioHack(ns, <string>data._[0] ?? "iron-gym", [1, 30, 5], <boolean>data.H, <boolean>data.B);
    await deployer.run(ns);
}

export function autocomplete(data: AutocompleteData): string[] {
    return data.servers; // This script autocompletes the list of servers.
}