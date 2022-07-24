/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    // How much RAM each purchased server will have. In this case, it'll
    // be 8GB.
    const ram = 8;

    const purchased_servers = ns.getPurchasedServers();
    const limit = ns.getPurchasedServerLimit();
    const files = ["/utils/info.js", "/utils/killServer.js", "/utils/locate.js", "/utils/monitor.js", "/utils/root.js", "/utils/targets.js"]

    // Continuously try to purchase servers until we've reached the maximum
    // amount of servers
    while (purchased_servers.length < limit) {
        // Check if we have enough money to purchase a server
        if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
            // If we have enough money, then:
            //  1. Purchase the server
            //  2. Increment our iterator to indicate that we've bought a new server
            const hostname = ns.purchaseServer("pserv-" + purchased_servers.length, ram);
            await ns.scp(files, hostname, "home");
            purchased_servers.push(hostname);
        }
        else {
            await ns.sleep(5000);
        }
    }
}