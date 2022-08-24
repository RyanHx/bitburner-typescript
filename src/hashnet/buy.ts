import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    ns.disableLog('sleep');
    ns.disableLog('getServerMoneyAvailable');
    const hacknet = ns.hacknet;
    const max_nodes = hacknet.maxNumNodes();
    const maxed_nodes: number[] = [];
    const budget = () => ns.getServerMoneyAvailable("home") * 0.01;
    const nodes = () => hacknet.numNodes();
    while (nodes() < max_nodes || maxed_nodes.length < max_nodes) {
        if (nodes() < max_nodes && budget() > hacknet.getPurchaseNodeCost()) {
            hacknet.purchaseNode();
        }
        for (let i = 0; i < nodes(); i++) {
            if (isMaxed(ns, i)) {
                if (!maxed_nodes.includes(i)) maxed_nodes.push(i);
                continue;
            }
            if (budget() > hacknet.getLevelUpgradeCost(i, 1)) {
                hacknet.upgradeLevel(i, 1);
            }
            if (budget() > hacknet.getRamUpgradeCost(i, 1)) {
                hacknet.upgradeRam(i, 1);
            }
            if (budget() > hacknet.getCoreUpgradeCost(i, 1)) {
                hacknet.upgradeCore(i, 1);
            }
            if (budget() > hacknet.getCacheUpgradeCost(i, 1)) {
                hacknet.upgradeCache(i, 1);
            }
        }
        await ns.sleep(100);
    }
}

function isMaxed(ns: NS, index: number) {
    const stats = ns.hacknet.getNodeStats(index);
    return stats.level === 300 &&
        stats.ram === 8192 &&
        stats.cores === 128 &&
        stats.cache === 15;
}