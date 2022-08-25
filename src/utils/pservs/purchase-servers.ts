import { copyUtils } from "utils/copy-utils";
import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    // How much RAM each purchased server will have.
    const ram = <number>ns.args[0] ?? 8;

    const purchased_servers = ns.getPurchasedServers();
    const limit = ns.getPurchasedServerLimit();

    // Continuously try to purchase servers until we've reached the maximum
    // amount of servers
    while (purchased_servers.length < limit) {
        // Check if we have enough money to purchase a server
        if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
            // If we have enough money, then:
            //  1. Purchase the server
            //  2. Increment our iterator to indicate that we've bought a new server
            const hostname = ns.purchaseServer("pserv-" + purchased_servers.length, ram);
            await copyUtils(ns, hostname);
            purchased_servers.push(hostname);
            await ns.sleep(0);
        }
        else {
            await ns.sleep(5000);
        }
    }
    ns.tprint("All servers bought.");
}