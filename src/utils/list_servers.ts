import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const args = ns.flags([["help", false]]);
    if (args.help) {
        ns.tprint("This script lists all servers on which you can run scripts.");
        ns.tprint(`Usage: run ${ns.getScriptName()}`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()}`);
        return;
    }

    const servers = list_servers(ns).concat(['home']);
    for (const server of servers) {
        const used = ns.getServerUsedRam(server);
        const max = ns.getServerMaxRam(server);
        ns.tprint(`${server} is ${ns.hasRootAccess(server) ? '' : 'not '}open. ${used} GB / ${max} GB (${(100 * used / max).toFixed(2)}%)`)
    }
}

function scan(ns: NS, parent: string, server: string, list: string[]) {
    const children = ns.scan(server);
    for (const child of children) {
        if (parent == child) {
            continue;
        }
        list.push(child);

        scan(ns, server, child, list);
    }
}

export function list_servers(ns: NS): string[] {
    const list: string[] = [];
    scan(ns, '', 'home', list);
    return list;
}