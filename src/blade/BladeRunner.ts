import { BladeburnerCurAction, NS } from '@ns'

const all_cities: string[] = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
const tasks = {
    d: "Diplomacy",
    fa: "Field Analysis",
    hrc: "Hyperbolic Regeneration Chamber"
}
const types = {
    g: "General",
    c: "Contract",
    o: "Operation",
    b: "Black Operation"
}
export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");
    let last_pop_analysis = 0;
    let current_city = "Sector-12";
    while (true) {
        if (performance.now() - last_pop_analysis > 1.8e6) {
            current_city = await getHighestCityPop(ns);
            ns.bladeburner.switchCity(current_city);
            last_pop_analysis = performance.now();
        }
        if (ns.bladeburner.getCityChaos(current_city) >= 50) {
            ns.print("Lowering city chaos.");
            while (ns.bladeburner.getCityChaos(current_city) > 0) {
                if (ns.bladeburner.getCurrentAction().name !== tasks.d) ns.bladeburner.startAction(types.g, tasks.d);
                await ns.sleep(1000);
            }
        }
        const stamina = ns.bladeburner.getStamina();
        if (stamina[0] > Math.ceil(stamina[1] * 0.55)) {
            await tryBlackOp(ns);
            const best_task = getBestTask(ns);
            if (ns.bladeburner.getCurrentAction().name !== best_task.name) {
                ns.print(`Best task returned: ${best_task.name}`);
                ns.bladeburner.startAction(best_task.type, best_task.name);
            }
            await ns.sleep(1000);
        } else {
            await recoverStamina(ns);
        }
        upgradeSkills(ns);
    }
}

async function getHighestCityPop(ns: NS) {
    ns.print("Calibrating city populations.");
    const city_pops: Record<string, number> = {};
    for (const city of all_cities) {
        ns.bladeburner.switchCity(city);
        while (ns.bladeburner.getContractNames().some(contract => ns.bladeburner.getActionEstimatedSuccessChance(types.c, contract)[0] < ns.bladeburner.getActionEstimatedSuccessChance(types.c, contract)[1])) {
            if (ns.bladeburner.getCurrentAction().name !== tasks.fa) ns.bladeburner.startAction(types.g, tasks.fa);
            await ns.sleep(10e3);
        }
        city_pops[city] = ns.bladeburner.getCityEstimatedPopulation(city);
        ns.print(`${city}: ${city_pops[city]}`);
    }
    return Object.keys(city_pops).reduce((best, current) => city_pops[current] > city_pops[best] ? current : best);
}

async function recoverStamina(ns: NS) {
    ns.print("Recovering stamina.");
    const contracts = ns.bladeburner.getContractNames();
    while (ns.bladeburner.getStamina()[0] !== ns.bladeburner.getStamina()[1]) {
        if (contracts.some(contract => ns.bladeburner.getActionEstimatedSuccessChance(types.c, contract)[0] < ns.bladeburner.getActionEstimatedSuccessChance(types.c, contract)[1])) {
            if (ns.bladeburner.getCurrentAction().name !== tasks.fa) ns.bladeburner.startAction(types.g, tasks.fa);
        } else if (ns.bladeburner.getCurrentAction().name !== tasks.hrc) {
            ns.bladeburner.startAction(types.g, tasks.hrc);
        }
        await ns.sleep(1000);
    }
}

function getBestTask(ns: NS): BladeburnerCurAction {
    const contracts = ns.bladeburner.getContractNames();
    const ops = ns.bladeburner.getOperationNames();
    for (let i = ops.length - 1; i >= 0; i--) {
        if (ns.bladeburner.getActionEstimatedSuccessChance(types.o, ops[i])[0] >= 0.8 && ns.bladeburner.getActionCountRemaining(types.o, ops[i]) > 0) {
            return { name: ops[i], type: types.o };
        }
    }
    for (let i = contracts.length - 1; i >= 0; i--) {
        if (ns.bladeburner.getActionEstimatedSuccessChance(types.c, contracts[i])[0] >= 0.8 && ns.bladeburner.getActionCountRemaining(types.c, contracts[i]) > 0) {
            return { name: contracts[i], type: types.c };
        }
    }
    if (ns.bladeburner.getActionCountRemaining(types.c, contracts[0]) > 0) {
        return { name: contracts[0], type: types.c };
    }
    return { name: "Incite Violence", type: types.g };
}

async function tryBlackOp(ns: NS) {
    const blackops = ns.bladeburner.getBlackOpNames();
    for (const op of blackops) {
        if (ns.bladeburner.getRank() < ns.bladeburner.getBlackOpRank(op)) break;
        if (ns.bladeburner.getActionEstimatedSuccessChance(types.b, op)[0] >= 0.8) {
            ns.bladeburner.startAction(types.b, op);
            while (ns.bladeburner.getCurrentAction().name === op) await ns.sleep(1000);
        }
    }
}

function upgradeSkills(ns: NS) {
    ns.bladeburner.upgradeSkill("Blade's Intuition");
    ns.bladeburner.upgradeSkill("Digital Observer");
    ns.bladeburner.upgradeSkill("Reaper");
    ns.bladeburner.upgradeSkill("Overclock");
    ns.bladeburner.upgradeSkill("Evasive System");
}