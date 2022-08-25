import { NS, AutocompleteData } from "@ns";

export async function main(ns: NS): Promise<void> {
    const route = getServerConnRoute(ns, <string>ns.args[0]);
    const conn_str = route.join("; connect ");
    ns.tprint(conn_str);
    await navigator.clipboard.writeText(conn_str);
}

export function autocomplete(data: AutocompleteData): string[] {
    return data.servers; // This script autocompletes the list of servers.
}

export function getServerConnRoute(ns: NS, target: string): string[] {
    const route = [target];
    while (route[0] !== "home") {
        route.unshift(ns.scan(route[0])[0]);
    }
    return route;
}