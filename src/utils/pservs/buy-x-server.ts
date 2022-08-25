import { NS, AutocompleteData } from '@ns'

export async function main(ns: NS): Promise<void> {
    const data = ns.flags([['f', false]]);
    const ram = <number>data._[0];
    if (ns.getServerMoneyAvailable("home") < ns.getPurchasedServerCost(ram)) {
        ns.tprint("Not enough money.");
        return;
    }
    if (ns.getPurchasedServers().length === ns.getPurchasedServerLimit()) {
        if (data.f === true) {
            const smallest = ns.getPurchasedServers().sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b))[0];
            ns.killall(smallest);
            ns.deleteServer(smallest);
            ns.purchaseServer(smallest, ram);
            return;
        } else {
            ns.tprint("Max servers reached. Use -f to force deletion.");
        }
    }
    let serv_i = 0;
    while (ns.serverExists(`pserv-${serv_i}`)) {
        serv_i++;
    }
    ns.purchaseServer(`pserv-${serv_i}`, ram);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: AutocompleteData, args: string[]): string[] {
    const values = [];
    for (let ram = 8; ram <= 524288; ram *= 2) {
        values.push(ram.toString());
    }
    return values
}