import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    if (!ns.gang.inGang()) {
        const faction = "Slum Snakes"
        if (ns.heart.break() > -54000) {
            for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
                ns.sleeve.setToCommitCrime(i, "Homicide");
            }
        }
        if (!ns.getPlayer().factions.includes(faction)) {
            while (!ns.singularity.joinFaction(faction)) await ns.sleep(10e3);
        }
        while (!ns.gang.createGang(faction)) await ns.sleep(10e3);
    }
    ns.spawn("/gang/gang.js", 1);
}