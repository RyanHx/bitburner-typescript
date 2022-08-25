import { Corporation, Employee, NS } from '@ns';
import { calcMaterials } from 'corp/production';


const starter_div_name = "agri-0";
const all_cities: string[] = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
const positions: string[] = ["Operations", "Engineer", "Business", "Management", "Research & Development"];
const core_levels = ["FocusWires", "Neural Accelerators", "Speech Processor Implants", "Nuoptimal Nootropic Injector Implants", "Smart Factories", "Smart Storage"];
let c: Corporation;
export async function startNewCorp(ns: NS): Promise<void> {
    c = ns.corporation;
    c.expandIndustry("Agriculture", starter_div_name);
    c.unlockUpgrade("Smart Supply");
    c.setSmartSupply(starter_div_name, "Sector-12", true);
    await setupCities();
    for (const upgrade of core_levels.slice(0, 5)) {
        c.levelUpgrade(upgrade);
        c.levelUpgrade(upgrade);
    }
    await buyMaterials(ns);
    await getInvestments(ns);
    for (const city of all_cities) {
        while (c.getWarehouse(starter_div_name, city).size < 3800) {
            try {
                c.upgradeWarehouse(starter_div_name, city, 1);
            } catch { /* await ns.sleep(1000); */ }
            await ns.sleep(1000);
        }
    }
    await buyMaterials(ns);
    while (c.getCorporation().funds < c.getExpandIndustryCost("Tobacco")) await ns.sleep(1000);
    c.expandIndustry("Tobacco", "tobacco-0");
}

async function setupCities() {
    for (const city of all_cities) {
        if (city !== "Sector-12") c.expandCity(starter_div_name, city);
        if (!c.hasWarehouse(starter_div_name, city)) c.purchaseWarehouse(starter_div_name, city);
        c.setSmartSupply(starter_div_name, city, true);
        for (let i = 0; i < 3; i++) {
            const emp = <Employee>c.hireEmployee(starter_div_name, city);
            c.assignJob(starter_div_name, city, emp.name, positions[i]);
        }
        c.upgradeWarehouse(starter_div_name, city, 2);
        c.sellMaterial(starter_div_name, city, "Food", "MAX", "MP");
        c.sellMaterial(starter_div_name, city, "Plants", "MAX", "MP");
    }
    c.hireAdVert(starter_div_name);
}

async function buyMaterials(ns: NS): Promise<void> {
    while (c.getCorporation().state !== "EXPORT") await ns.sleep(1);
    const division = c.getDivision(starter_div_name);
    const names = ["Hardware", "Robots", "AI Cores", "Real Estate"];
    for (const city of division.cities) {
        if (!c.hasWarehouse(division.name, city)) continue;
        const warehouse = c.getWarehouse(division.name, city);
        const mat_counts = calcMaterials(division.type, warehouse.size * 0.6);
        if (!mat_counts) continue;
        for (const material of names) {
            const city_mat_info = c.getMaterial(division.name, city, material);
            const req_amount = mat_counts[material] - city_mat_info.qty
            if (req_amount > 0) {
                c.buyMaterial(division.name, city, material, req_amount / 10);
            } else {
                c.buyMaterial(division.name, city, material, 0);
            }
        }
    }
    while (c.getCorporation().state === "EXPORT") await ns.sleep(1);
    while (c.getCorporation().state !== "EXPORT") await ns.sleep(1);
    for (const city of division.cities) {
        if (!c.hasWarehouse(division.name, city)) continue;
        for (const material of names) {
            c.buyMaterial(division.name, city, material, 0);
        }
    }
}

function assignNextEmployees() {
    for (const city of all_cities) {
        c.upgradeOfficeSize(starter_div_name, city, 3);
        c.upgradeOfficeSize(starter_div_name, city, 3);
        const new_emps: Employee[] = [];
        for (let i = 0; i < 6; i++) {
            new_emps.push(<Employee>c.hireEmployee(starter_div_name, city));
        }
        c.assignJob(starter_div_name, city, (<Employee>new_emps.pop()).name, positions[0]);
        c.assignJob(starter_div_name, city, (<Employee>new_emps.pop()).name, positions[1]);
        for (let i = 0; i < 2; i++) {
            c.assignJob(starter_div_name, city, (<Employee>new_emps.pop()).name, positions[3]);
            c.assignJob(starter_div_name, city, (<Employee>new_emps.pop()).name, positions[4]);
        }
        //c.upgradeWarehouse(starter_div_name, city, 2);
    }
}

async function getInvestments(ns: NS) {
    const mults = ns.getBitNodeMultipliers();
    while (c.getInvestmentOffer().funds < 210e9 * mults.CorporationValuation) await ns.sleep(1000);
    c.acceptInvestmentOffer();
    assignNextEmployees();
    while (c.getUpgradeLevel("Smart Factories") < 10) {
        try {
            c.levelUpgrade("Smart Factories");
        } catch { await ns.sleep(1000); }
    }
    while (c.getUpgradeLevel("Smart Storage") < 10) {
        try {
            c.levelUpgrade("Smart Storage");
        } catch { await ns.sleep(1000); }
    }
    for (const city of all_cities) {
        while (c.getWarehouse(starter_div_name, city).size < 2000) {
            try {
                c.upgradeWarehouse(starter_div_name, city, 1);
                await buyMaterials(ns);
            } catch { /**/ }
            await ns.sleep(1000);
        }
    }
    await buyMaterials(ns);
    while (c.getInvestmentOffer().funds < 5e12 * mults.CorporationValuation) await ns.sleep(1000);
    c.acceptInvestmentOffer();
}