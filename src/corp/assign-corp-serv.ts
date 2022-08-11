import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    //
    for (const server of (<string>ns.read("nuked.txt")).split(",")) {
        if (ns.hasRootAccess(server) && ns.getServerMaxRam(server) >= 1024) {
            await ns.scp(ns.ls("home", "/corp/"), server, "home");
            ns.killall(server);
            ns.exec("/corp/ceo.js", server, 1);
            return;
        }
    }
}