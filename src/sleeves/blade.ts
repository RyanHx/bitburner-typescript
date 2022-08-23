import { Bladeburner, NS, Sleeve } from '@ns'
//const all_cities: string[] = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
let blade: Bladeburner;
let sleeve: Sleeve;
const types = {
    c: "Contract",
    b: "Black Operation"
}
const tasks = {
    d: "Diplomacy",
    fa: "Field analysis",
    is: "Infiltrate synthoids"
}
export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");
    blade = ns.bladeburner;
    sleeve = ns.sleeve;
    let recover_chaos = true;
    let recover_contracts = true;
    while (true) {
        const city = blade.getCity();
        if (blade.getCityChaos(city) < 2) recover_chaos = false;
        if (blade.getContractNames().every(contract => blade.getActionCountRemaining(types.c, contract) > 30) || blade.getCityChaos(city) >= 40) recover_contracts = false;

        if (blade.getContractNames().some(contract => blade.getActionCountRemaining(types.c, contract) < 10) || recover_contracts) {
            recover_contracts = true;
            bladeAllSleeves(ns, city, tasks.is);
        } else if (blade.getBlackOpNames().some(op => blade.getActionEstimatedSuccessChance(types.b, op)[0] < blade.getActionEstimatedSuccessChance(types.b, op)[1])) {
            bladeAllSleeves(ns, city, tasks.fa);
        } else if (blade.getCityChaos(city) > 10 || recover_chaos) {
            recover_chaos = true;
            bladeAllSleeves(ns, city, tasks.d);
        } else {
            contractAllSleeves(ns, city);
            // await crimeAllSleeves(ns, city);
        }
        await ns.sleep(100);
    }
}

function bladeAllSleeves(ns: NS, city: string, task: string) {
    for (let i = 0; i < sleeve.getNumSleeves(); i++) {
        if (sleeve.getInformation(i).city !== city) {
            ns.print(`Moving sleeve ${i} to ${city}`);
            if (!sleeve.travel(i, city)) ns.print("Failed");
        }
        if (task === tasks.is) {
            if (sleeve.getTask(i)?.type !== "INFILTRATE" && sleeve.setToBladeburnerAction(i, task)) ns.print(`Setting sleeve ${i} to ${task} in ${city}`);
        } else if (!sleeve.getTask(i) || sleeve.getTask(i).actionName === undefined || sleeve.getTask(i).actionName.toLowerCase() !== task.toLowerCase()) {
            ns.print(`Setting sleeve ${i} to ${task} in ${city}`);
            if (!sleeve.setToBladeburnerAction(i, task)) ns.print("Failed");
        }
    }
}

function contractAllSleeves(ns: NS, city: string) {
    const contracts = ns.bladeburner.getContractNames();
    for (let i = 0; i < sleeve.getNumSleeves(); i++) {
        if (sleeve.getInformation(i).city !== city) {
            ns.print(`Moving sleeve ${i} to ${city}`);
            if (!sleeve.travel(i, city)) ns.print("Failed");
        }
        const contract = contracts.pop();
        const stats = ns.sleeve.getSleeveStats(i);
        if ([stats.agility, stats.defense, stats.strength, stats.dexterity].every(stat => stat > 1000)) {
            if (contract && ns.bladeburner.getActionCountRemaining(types.c, contract) > 300 && (sleeve.getTask(i)?.actionName?.toLowerCase() === contract.toLowerCase() || sleeve.setToBladeburnerAction(i, "Take on contracts", contract))) {
                continue;
            }
            tryStartCrime(ns, i, "Assassination");
        } else {
            tryStartCrime(ns, i, "Homicide");
        }
    }
}

function tryStartCrime(ns: NS, s_index: number, crime: string) {
    if (!sleeve.getTask(s_index) || sleeve.getTask(s_index).type !== 'CRIME') {
        ns.print(`Setting sleeve ${s_index} to ${crime}`);
        sleeve.setToCommitCrime(s_index, crime);
    }
}

async function crimeAllSleeves(ns: NS, city: string) {
    let assassinate = false;
    for (let i = 0; i < sleeve.getNumSleeves(); i++) {
        if (!sleeve.getTask(i) || sleeve.getTask(i).type !== 'CRIME') {
            const stats = ns.sleeve.getSleeveStats(i);
            if ([stats.agility, stats.defense, stats.strength, stats.dexterity].every(stat => stat > 1000)) {
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