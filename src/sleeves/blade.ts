import { Bladeburner, NS, Sleeve } from '@ns'
//const all_cities: string[] = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
let blade: Bladeburner;
let sleeve: Sleeve;
export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");
    blade = ns.bladeburner;
    sleeve = ns.sleeve;
    const tasks = {
        d: "Diplomacy",
        fa: "Field analysis",
        is: "Infiltrate synthoids"
    }
    const types = {
        c: "Contract",
        b: "Black Operation"
    }
    while (true) {
        const city = blade.getCity();
        if (blade.getContractNames().some(contract => blade.getActionCountRemaining(types.c, contract) === 0)) {
            bladeAllSleeves(ns, city, tasks.is);
        } else if (blade.getBlackOpNames().some(op => blade.getActionEstimatedSuccessChance(types.b, op)[0] < blade.getActionEstimatedSuccessChance(types.b, op)[1])) {
            bladeAllSleeves(ns, city, tasks.fa);
        } else if (blade.getCityChaos(city) > 1) {
            bladeAllSleeves(ns, city, tasks.d);
        } else {
            await crimeAllSleeves(ns, city);
        }
        await ns.sleep(1000);
    }
}

function bladeAllSleeves(ns: NS, city: string, task: string) {
    for (let i = 0; i < sleeve.getNumSleeves(); i++) {
        if (sleeve.getInformation(i).city !== city) {
            ns.print(`Moving sleeve ${i} to ${city}`);
            if (!sleeve.travel(i, city)) ns.print("Failed");
        }
        if (!sleeve.getTask(i) || sleeve.getTask(i).actionName === undefined || sleeve.getTask(i).actionName.toLowerCase() !== task.toLowerCase()) {
            ns.print(`Setting sleeve ${i} to ${task} in ${city}`);
            if (!sleeve.setToBladeburnerAction(i, task)) ns.print("Failed");
        }
    }
}

async function crimeAllSleeves(ns: NS, city: string) {
    let assassinate = false;
    for (let i = 0; i < sleeve.getNumSleeves(); i++) {
        if (!sleeve.getTask(i) || sleeve.getTask(i).type !== 'CRIME') {
            const stats = ns.sleeve.getSleeveStats(i);
            if (stats.agility > 1000 && stats.defense > 1000 && stats.strength > 1000 && stats.dexterity > 1000) {
                ns.print(`Setting sleeve ${i} to Assassination`);
                sleeve.setToCommitCrime(i, "Assassination");
                assassinate = true;
            } else {
                ns.print(`Setting sleeve ${i} to Homicide`);
                sleeve.setToCommitCrime(i, "Homicide");
            }
        }
    }
    if (assassinate) {
        const wait_start = Date.now();
        while (Date.now() - wait_start < 300000) {
            if (blade.getCity() !== city) break;
            await ns.sleep(1000);
        }
    }
}