import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    ns.disableLog('sleep');
    const data = ns.flags([
        ['target', 'n00dles'],
        ['sec', false], // Min sec
        ['mon', false], // Max money
        ['gym', false],
        ['fund', false], // Corp funds
        ['res', false], // Corp research
        ['study', false],
        ['bsp', false], // BB skill points
        ['br', false] // BB ranks
    ]);
    const budget = () => ns.hacknet.numHashes() * 0.25;
    while (true) {
        const targetMinSec = ns.getServer(<string>data['target']).minDifficulty;
        if (budget() > ns.hacknet.hashCost("Reduce Minimum Security") && targetMinSec > 1 && data['sec']) {
            ns.hacknet.spendHashes("Reduce Minimum Security", <string>data['target']);
        } else if (budget() > ns.hacknet.hashCost("Increase Maximum Money") && data['mon']) {
            ns.hacknet.spendHashes("Increase Maximum Money", <string>data['target']);
        } else if (budget() > ns.hacknet.hashCost("Improve Studying") && data['study']) {
            ns.hacknet.spendHashes("Improve Studying");
        } else if (budget() > ns.hacknet.hashCost("Improve Gym Training") && data['gym']) {
            ns.hacknet.spendHashes("Improve Gym Training");
        } else if (budget() > ns.hacknet.hashCost("Sell for Corporation Funds") && ns.getPlayer().hasCorporation && data['fund']) {
            ns.hacknet.spendHashes("Sell for Corporation Funds");
        } else if (budget() > ns.hacknet.hashCost("Exchange for Corporation Research") && ns.getPlayer().hasCorporation && data['res']) {
            ns.hacknet.spendHashes("Exchange for Corporation Research");
        } else if (budget() > ns.hacknet.hashCost("Exchange for Bladeburner SP") && ns.getPlayer().inBladeburner && data['bsp']) {
            ns.hacknet.spendHashes("Exchange for Bladeburner SP");
        } else if (budget() > ns.hacknet.hashCost("Exchange for Bladeburner Rank") && ns.getPlayer().inBladeburner && data['br']) {
            ns.hacknet.spendHashes("Exchange for Bladeburner Rank");
        } else if (ns.hacknet.numHashes() > ns.hacknet.hashCapacity() * 0.9) {
            ns.hacknet.spendHashes("Sell for Money");
        }
        await ns.sleep(100);
    }
}