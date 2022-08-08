import { NS } from '@ns'
import { startNewCorp } from '/corp/CorpStartup';
import { Manager } from '/corp/manager'
import { OfficeManager } from '/corp/OfficeManager';
import { WarehouseManager } from '/corp/WarehouseManager';

const managers: Manager[] = [];
export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");
    ns.atExit(() => abortBuyOrders(ns));
    if (ns.corporation.getCorporation().divisions.length === 0) await startNewCorp(ns);
    for (const division of ns.corporation.getCorporation().divisions) {
        managers.push(new OfficeManager(ns, division.name));
        managers.push(new WarehouseManager(ns, division.name));
    }
    while (true) {
        tryBuyUpgrades(ns);
        if (ns.corporation.getCorporation().state === 'EXPORT') {
            for (const division of ns.corporation.getCorporation().divisions) {
                if (!(managers.some(manager => manager.division == division.name))) {
                    managers.push(new OfficeManager(ns, division.name));
                    managers.push(new WarehouseManager(ns, division.name));
                }
            }
            for (const manager of managers) {
                await manager.process(ns);
            }
            while (ns.corporation.getCorporation().state === 'EXPORT') {
                await ns.sleep(1);
            }
        }
        if (!ns.corporation.getCorporation().public) {
            const investment = ns.corporation.getInvestmentOffer();
            if (investment.round === 3 && investment.funds >= 800e12) {
                commitFraud(ns, 800e12);
            } else if (investment.round === 4 && investment.funds >= 1.5e15) {
                commitFraud(ns, 1.5e15);
                //ns.corporation.goPublic(0);
            }
        }
        await ns.sleep(1);
    }
}

function tryBuyUpgrades(ns: NS) {
    const core_levels = ["FocusWires", "Neural Accelerators", "Speech Processor Implants", "Nuoptimal Nootropic Injector Implants", "Smart Factories", "Smart Storage"];
    const other_levels = ["DreamSense", "Wilson Analytics", "ABC SalesBots", "Project Insight"];
    const core_upgraded = core_levels.every(upgrade => ns.corporation.getUpgradeLevel(upgrade) >= 20);
    for (const upgrade of !core_upgraded ? core_levels : core_levels.concat(other_levels)) {
        if (ns.corporation.getUpgradeLevelCost(upgrade) < ns.corporation.getCorporation().funds * 0.001) ns.corporation.levelUpgrade(upgrade);
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function commitFraud(ns: NS, min_investment: number) {
    //
}

function abortBuyOrders(ns: NS) {
    for (const manager of managers) {
        try {
            (<WarehouseManager>manager).stopAllBuyOrders(ns);
        } catch {/* Office manager */ }
    }
}