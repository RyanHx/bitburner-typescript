import { NS } from '@ns'
import { BatchManager } from '/batch/BatchManager'

export async function main(ns: NS): Promise<void> {
    //
    ns.disableLog("ALL");
    const manager = new BatchManager(ns, <string>ns.args[0], <number>ns.args[1] ?? 0.9);
    await manager.run(ns)
}

export function autocomplete(data: AutocompleteData): string[] {
    return data.servers; // This script autocompletes the list of servers.
}