import { Bladeburner, NS, Sleeve } from '@ns'
//const all_cities: string[] = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
let blade: Bladeburner;
let sleeve: Sleeve;
const types = {
    c: "Contract",
    o: "Operation",
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
    const actionsNumAbove = (num: number) => {
        return blade.getContractNames().every(contract => blade.getActionCountRemaining(types.c, contract) > num) &&
            blade.getOperationNames().every(op => blade.getActionCountRemaining(types.o, op) > num)
    }
    while (true) {
        const city = blade.getCity();
        if (blade.getCityChaos(city) < 2) recover_chaos = false;
        if (actionsNumAbove(50) || blade.getCityChaos(city) >= 40) recover_contracts = false;

        if (!recover_chaos && (!actionsNumAbove(20) || recover_contracts)) {
            recover_contracts = true;
            bladeAllSleeves(ns, city, tasks.is);
        } else if (blade.getBlackOpNames().some(op => blade.getActionEstimatedSuccessChance(types.b, op)[0] < blade.getActionEstimatedSuccessChance(types.b, op)[1])) {
            bladeAllSleeves(ns, city, tasks.fa);
        } else if (blade.getCityChaos(city) > 10 || recover_chaos) {
            recover_chaos = true;
            bladeAllSleeves(ns, city, tasks.d);
        } else {
            contractAllSleeves(ns, city);
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
    let set_shock = true;
    main: for (let i = 0; i < sleeve.getNumSleeves(); i++) {
        if (sleeve.getInformation(i).city !== city) {
            ns.print(`Moving sleeve ${i} to ${city}`);
            if (!sleeve.travel(i, city)) ns.print("Failed");
        }
        const stats = ns.sleeve.getSleeveStats(i);
        if (stats.shock > 0 && set_shock) {
            if (sleeve.getTask(i)?.type !== 'RECOVERY') sleeve.setToShockRecovery(i);
            set_shock = false;
            continue;
        }
        if ([stats.agility, stats.defense, stats.strength, stats.dexterity].every(stat => stat > 1000)) {
            while (contracts.length > 0) {
                const contract = contracts.pop();
                if (contract && ns.bladeburner.getActionCountRemaining(types.c, contract) > 300 &&
                    (sleeve.getTask(i)?.actionName?.toLowerCase() === contract.toLowerCase() || sleeve.setToBladeburnerAction(i, "Take on contracts", contract))) {
                    continue main;
                }
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