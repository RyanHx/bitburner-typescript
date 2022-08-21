import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("sleep");
    const combat_augs = ["HemoRecirculator", "Augmented Targeting I", "Augmented Targeting II", "Augmented Targeting III", "Synthetic Heart", "Combat Rib I", "Combat Rib II", "Combat Rib III", "Nanofiber Weave", "Wired Reflexes", "Bionic Spine", "Bionic Legs", "Bionic Arms", "BrachiBlades", "Graphene Bionic Arms Upgrade", "INFRARET Enhancement", "DermaForce Particle Barrier", "NutriGen Implant", "Graphene Bionic Legs Upgrade", "NEMEAN Subdermal Weave", "Neurotrainer I", "Neurotrainer II", "Neurotrainer III", "LuminCloaking-V1 Skin Implant", "LuminCloaking-V2 Skin Implant", "SmartSonar Implant", "Power Recirculation Core", "SPTN-97 Gene Modification", "Graphene BrachiBlades Upgrade", "Photosynthetic Cells", "nextSENS Gene Modification", "Xanipher", "Neotra", "CordiARC Fusion Reactor", "Graphene Bionic Spine Upgrade", "Graphene Bone Lacings", "Synfibril Muscle", "The Black Hand", "HyperSight Corneal Implant"]
    const complete_sleeve: number[] = [];
    while (complete_sleeve.length < ns.sleeve.getNumSleeves()) {
        for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
            if (complete_sleeve.includes(i) || ns.sleeve.getSleeveStats(i).shock > 0) continue;
            for (const aug of ns.sleeve.getSleevePurchasableAugs(i)) {
                if (combat_augs.includes(aug.name) && ns.getServerMoneyAvailable("home") > aug.cost) {
                    ns.sleeve.purchaseSleeveAug(i, aug.name);
                    const bought_augs = ns.sleeve.getSleeveAugmentations(i)
                    if (combat_augs.every(aug => bought_augs.includes(aug))) {
                        complete_sleeve.push(i);
                        break;
                    }
                }
            }
        }
        await ns.sleep(1000);
    }
    ns.tprint("All sleeves combat augs bought.");
}