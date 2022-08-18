import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    for (const faction of ns.getPlayer().factions) {
        while (ns.singularity.purchaseAugmentation(faction, 'NeuroFlux Governor')) {
            await ns.sleep(1);
        }
    }
}