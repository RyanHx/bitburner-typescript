import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");
    const gymClasses = {
        str: "GYMSTRENGTH",
        def: "GYMDEFENSE",
        dex: "GYMDEXTERITY",
        agi: "GYMAGILITY"
    };
    ns.print("Training strength");
    while (ns.getPlayer().skills.strength < 100) {
        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "CLASS" || work.classType !== gymClasses.str) ns.singularity.gymWorkout("Powerhouse Gym", "strength", true);
        await ns.sleep(100);
    }
    ns.print("Training defense");
    while (ns.getPlayer().skills.defense < 100) {
        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "CLASS" || work.classType !== gymClasses.def) ns.singularity.gymWorkout("Powerhouse Gym", "defense", true);
        await ns.sleep(100);
    }
    ns.print("Training dexterity");
    while (ns.getPlayer().skills.dexterity < 100) {
        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "CLASS" || work.classType !== gymClasses.dex) ns.singularity.gymWorkout("Powerhouse Gym", "dexterity", true);
        await ns.sleep(100);
    }
    ns.print("Training agility");
    while (ns.getPlayer().skills.agility < 100) {
        const work = ns.singularity.getCurrentWork();
        if (!work || work.type !== "CLASS" || work.classType !== gymClasses.agi) ns.singularity.gymWorkout("Powerhouse Gym", "agility", true);
        await ns.sleep(100);
    }
    ns.bladeburner.joinBladeburnerDivision();
}
