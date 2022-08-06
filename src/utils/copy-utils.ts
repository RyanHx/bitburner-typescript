import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    const flags = ns.flags([
        ['help', false],
    ])
    if (flags._.length === 0 || flags.help) {
        ns.tprint("This script copies utility files from home to all given servers.");
        ns.tprint(`USAGE: run ${ns.getScriptName()} ...SERVER_NAMES`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()} n00dles joesguns`)
        return;
    }

    await copyUtils(ns, flags._);
}

export async function copyUtils(ns: NS, servers: string[] | string): Promise<void> {
    if (!Array.isArray(servers)) {
        servers = [servers];
    }

    const wanted_prefix = ["/utils/", "/factions/"];
    const to_copy = [];
    for (const filename of ns.ls("home")) {
        if (wanted_prefix.some(prefix => filename.startsWith(prefix))) {
            to_copy.push(filename);
        }
    }
    for (const server of servers) {
        if (ns.serverExists(server) === true) {
            await ns.scp(to_copy, server, "home");
        }
    }
}