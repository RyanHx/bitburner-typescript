import { Employee, NS } from '@ns'
import { Manager } from '/corp/manager';

export class OfficeManager implements Manager {
    readonly all_cities: string[] = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
    readonly positions: string[] = ["Operations", "Engineer", "Business", "Management", "Research & Development"];
    readonly division: string;
    readonly main_city = "Aevum";
    #city_employ_pos_index: Record<string, number> = {};
    constructor(ns: NS, division: string) {
        this.division = division;
        for (const city of this.all_cities) {
            this.#city_employ_pos_index[city] = 0;
            try {
                const office = ns.corporation.getOffice(division, city);
                for (let i = 1; i < this.positions.length; i++) {
                    type EmpKey = keyof typeof office.employeeJobs;
                    if (office.employeeJobs[this.positions[i] as EmpKey] < office.employeeJobs[this.positions[i - 1] as EmpKey]) {
                        this.#city_employ_pos_index[city] = i;
                        break;
                    }
                }
            } catch {
                ns.print(`${division} not in ${city}`);
            }
        }
    }

    async process(ns: NS): Promise<void> {
        this.#tryExpand(ns);
        this.#tryUpMainOrAdv(ns);
        this.#tryUpOffice(ns);
        this.#tryEmploy(ns);
        this.#tryResearch(ns);
    }

    #tryExpand(ns: NS): void {
        const division = ns.corporation.getDivision(this.division);
        if (division.cities.length === 6) return;
        for (const city of this.all_cities) {
            try { ns.corporation.expandCity(division.name, city); }
            catch (e) {
                //ns.print(e)
            }
        }
    }

    #tryUpMainOrAdv(ns: NS): void {
        const division = ns.corporation.getDivision(this.division);
        while (ns.corporation.getOffice(this.division, this.main_city).size < 30 && ns.corporation.getCorporation().funds > ns.corporation.getOfficeSizeUpgradeCost(this.division, this.main_city, 3))
            ns.corporation.upgradeOfficeSize(division.name, this.main_city, 3);

        const canUpOffice = () => {
            const off_up_cost = ns.corporation.getOfficeSizeUpgradeCost(this.division, this.main_city, 15);
            return off_up_cost < ns.corporation.getHireAdVertCost(division.name) && ns.corporation.getCorporation().funds * 0.1 > off_up_cost;
        }
        const canUpAdv = () => {
            const adv_up_cost = ns.corporation.getHireAdVertCost(division.name);
            return adv_up_cost < ns.corporation.getOfficeSizeUpgradeCost(this.division, this.main_city, 15) && ns.corporation.getCorporation().funds * 0.1 > adv_up_cost;
        }
        while (canUpOffice() === true) {
            ns.corporation.upgradeOfficeSize(division.name, this.main_city, 15);
        }
        while (canUpAdv() === true) {
            ns.corporation.hireAdVert(division.name);
        }
    }

    #tryUpOffice(ns: NS): void {
        const division = ns.corporation.getDivision(this.division);
        const main_office = ns.corporation.getOffice(this.division, this.main_city);
        for (const city of division.cities) {
            const canUpOffice = () => {
                return ns.corporation.getCorporation().funds * 0.01 > ns.corporation.getOfficeSizeUpgradeCost(this.division, city, 15) &&
                    main_office.size - ns.corporation.getOffice(this.division, city).size + 15 >= 60;
            }
            while (canUpOffice()) {
                ns.corporation.upgradeOfficeSize(division.name, city, 15);
            }
        }
    }

    #tryEmploy(ns: NS): void {
        const division = ns.corporation.getDivision(this.division);
        for (const city of division.cities) {
            const city_off = ns.corporation.getOffice(division.name, city);
            let open_pos = city_off.size - city_off.employees.length
            while (open_pos > 0) {
                const hiree = <Employee>ns.corporation.hireEmployee(division.name, city);
                if (!hiree) break;
                if (this.#city_employ_pos_index[city] === this.positions.length) this.#city_employ_pos_index[city] = 0;
                ns.corporation.assignJob(division.name, city, hiree.name, this.positions[this.#city_employ_pos_index[city]++]);
                open_pos--;
            }
        }
    }

    #tryResearch(ns: NS): void {
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


