/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const route = [<string>ns.args[0]];
    let server = <string>ns.args[0];
    while (server != "home") {
        server = ns.scan(server)[0];
        route.unshift(server);
    }
    const conn_str = route.join("; connect ");
    ns.tprint(conn_str);
    await navigator.clipboard.writeText(conn_str);
}

export function autocomplete(data: AutocompleteData): string[] {
    return data.servers; // This script autocompletes the list of servers.
}