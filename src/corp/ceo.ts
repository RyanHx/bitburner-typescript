import { NS } from '@ns'
import { Manager } from '/corp/manager'
import { WarehouseManager } from '/corp/WarehouseManager';

export async function main(ns: NS): Promise<void> {
    const managers: Manager[] = [];
    for (const division of ns.corporation.getCorporation().divisions) {
        managers.push(new WarehouseManager(ns, division.name));
    }
    while (true) {
        if (ns.corporation.getCorporation().state === 'EXPORT') {
            for (const manager of managers) {
                manager.process(ns);
            }
            while (ns.corporation.getCorporation().state === 'EXPORT') {
                await ns.sleep(1);
            }
        }
        await ns.sleep(1);
    }
}