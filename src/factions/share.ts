import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const server = ns.getServer()
    const ram_allowance = 0.9
    const script_ram = 4
    let threads = Math.floor((server.maxRam * ram_allowance) / script_ram);
    if (ns.args[0]) {
        threads = Math.floor((server.maxRam * parseFloat(<string>ns.args[0])) / script_ram);
    }
    ns.spawn("/factions/_share.js", threads);
}