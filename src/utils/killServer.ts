/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    ns.killall(<string>ns.args[0]);
}

export function autocomplete(data: AutocompleteData): string[] {
    return data.servers; // This script autocompletes the list of servers.
}