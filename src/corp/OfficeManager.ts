import { Employee, NS } from '@ns'
import { Manager } from '/corp/manager';

export class OfficeManager implements Manager {
    readonly all_cities: string[] = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
    readonly positions: string[] = ["Operations", "Engineer", "Business", "Management", "Research & Development"];
    readonly division: string;
    readonly main_city = "Aevum";
    private city_employ_pos_index: Record<string, number> = {};

    constructor(ns: NS, division: string) {
        this.division = division;
        for (const city of this.all_cities) {
            this.city_employ_pos_index[city] = 0;
            try {
                const office = ns.corporation.getOffice(division, city);
                for (let i = 1; i < this.positions.length; i++) {
                    if (office.employeeJobs[this.positions[i]] < office.employeeJobs[this.positions[i - 1]]) {
                        this.city_employ_pos_index[city] = i;
                        break;
                    }
                }
            } catch {
                ns.print(`${division} not in ${city}`);
            }

        }
    }

    async process(ns: NS): Promise<void> {
        this.tryExpand(ns);
        this.tryUpAevumOrAdv(ns);
        this.tryUpOffice(ns);
        await this.tryEmploy(ns);
        this.tryResearch(ns);
    }

    private tryExpand(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        if (division.cities.length === 6) return;
        for (const city of this.all_cities) {
            try { ns.corporation.expandCity(division.name, city); }
            catch (e) {
                //ns.print(e)
            }
        }
    }

    private tryUpAevumOrAdv(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        const main_office = ns.corporation.getOffice(this.division, this.main_city);

        const off_up_cost = ns.corporation.getOfficeSizeUpgradeCost(this.division, this.main_city, 15);
        const can_up_office = ns.corporation.getCorporation().funds * 0.001 > off_up_cost && main_office.size <= 285;

        const advert_cost = ns.corporation.getHireAdVertCost(division.name);
        const can_advert = ns.corporation.getCorporation().funds * 0.001 > advert_cost;

        if (off_up_cost < advert_cost && can_up_office) ns.corporation.upgradeOfficeSize(division.name, this.main_city, 15);
        else if ((off_up_cost > advert_cost || main_office.size >= 300) && can_advert) ns.corporation.hireAdVert(division.name);
    }

    private tryUpOffice(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        for (const city of division.cities) {
            const city_off = ns.corporation.getOffice(this.division, city);
            if (city_off.size < 300 && city_off.size >= 285) {
                if (ns.corporation.getCorporation().funds * 0.001 > ns.corporation.getOfficeSizeUpgradeCost(this.division, city, 3)) {
                    ns.corporation.upgradeOfficeSize(division.name, city, 3);
                }
                continue;
            }
            const off_up_cost = ns.corporation.getOfficeSizeUpgradeCost(this.division, city, 15);
            let can_up_office = ns.corporation.getCorporation().funds * 0.001 > off_up_cost;
            if (ns.corporation.getOffice(division.name, this.main_city).size >= 300) can_up_office = can_up_office && city_off.size <= 285;
            else can_up_office = can_up_office && ns.corporation.getOffice(division.name, this.main_city).size - city_off.size > 60;
            if (can_up_office) ns.corporation.upgradeOfficeSize(division.name, city, 15);
        }
    }

    private async tryEmploy(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        for (const city of division.cities) {
            const city_off = ns.corporation.getOffice(division.name, city);
            let open_pos = city_off.size - city_off.employees.length
            while (open_pos > 0) {
                const hiree = <Employee>ns.corporation.hireEmployee(division.name, city);
                if (!hiree) break;
                if (this.city_employ_pos_index[city] === this.positions.length) this.city_employ_pos_index[city] = 0;
                await ns.corporation.assignJob(division.name, city, hiree.name, this.positions[this.city_employ_pos_index[city]++]);
                open_pos--;
            }
        }
    }

    private tryResearch(ns: NS) {
        const c = ns.corporation;
        const division = c.getDivision(this.division);
        if (division.research >= 10e3 && !c.hasResearched(division.name, "Hi-Tech R&D Laboratory")) c.research(division.name, "Hi-Tech R&D Laboratory");
        if (division.research >= 140e3 && !c.hasResearched(division.name, "Market-TA.I")) {
            c.research(division.name, "Market-TA.I");
            c.research(division.name, "Market-TA.II");
        }
        if (c.hasResearched(division.name, "Hi-Tech R&D Laboratory") && c.hasResearched(division.name, "Market-TA.II")) {
            const all_research = ["AutoBrew", "AutoPartyManager", "Automatic Drug Administration", "Bulk Purchasing", "CPH4 Injections", "Drones", "Drones - Assembly", "Drones - Transport", "Go-Juice", "JoyWire", "Overclock", "Self-Correcting Assemblers", "Sti.mu", "sudo.Assist", "uPgrade: Capacity.I", "uPgrade: Capacity.II", "uPgrade: Dashboard", "uPgrade: Fulcrum"];
            for (const research of all_research) {
                try {
                    const cost = c.getResearchCost(division.name, research);
                    if (!c.hasResearched(division.name, research) && c.getDivision(this.division).research > cost) c.research(division.name, research);
                } catch {/**Research not in current industry */ }
            }
        }
    }
}


