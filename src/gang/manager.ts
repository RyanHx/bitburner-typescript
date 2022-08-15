import { GangMemberInfo } from "/../NetscriptDefinitions";

export class GangManager {
    #member_name_index: number;
    #need_power: boolean;
    #faction: string;
    #tasks: Record<string, string>;

    constructor(ns: NS) {
        this.#member_name_index = 0;
        this.#need_power = true;
        this.#faction = ns.gang.getGangInformation().faction;
        this.#tasks = {
            tw: "Territory Warfare",
            vj: "Vigilante Justice",
            ht: "Human Trafficking",
            t: "Terrorism",
            train_combat: "Train Combat",
            unassign: "Unassigned"
        }
        for (const name of ns.gang.getMemberNames()) {
            try {
                const index = parseInt(name);
                this.#member_name_index = Math.max(this.#member_name_index, index);
            } catch {/* */ }
        }
        this.#member_name_index++;
    }

    process(ns: NS): void {
        if (ns.gang.recruitMember(`${this.#member_name_index}`)) this.#member_name_index++;
        this.#tryAscend(ns);
        this.#tryTrain(ns);
        this.#tryBuyEquipment(ns);
        this.#tryGainTerritory(ns);
        this.#tryCrime(ns);
    }

    #tryTrain(ns: NS): void {
        const members = ns.gang.getMemberNames().map(name => ns.gang.getMemberInformation(name));
        for (const member of members) {
            const lowest_stat = Math.min(member.str, member.agi, member.def, member.dex);
            if (lowest_stat < 600 && member.task !== this.#tasks.train_combat) {
                ns.print(`Training ${member.name} to 600 combat`);
                ns.gang.setMemberTask(member.name, this.#tasks.train_combat);
            }
        }
    }

    #tryAscend(ns: NS): void {
        const members = ns.gang.getMemberNames().map(name => ns.gang.getMemberInformation(name));
        for (const member of members) {
            const ascension = ns.gang.getAscensionResult(member.name);
            if (ascension) {
                const highest_asc_result = Math.max(ascension.agi, ascension.def, ascension.dex, ascension.str);
                const lowest_asc_mult = Math.min(member.agi_asc_mult, member.def_asc_mult, member.dex_asc_mult, member.str_asc_mult);
                const valid_asc_mult = (lowest_asc_mult < 8 && highest_asc_result >= 1.2) || (lowest_asc_mult >= 8 && highest_asc_result >= 1.01);
                const gang_info = ns.gang.getGangInformation();
                if (valid_asc_mult && member.earnedRespect <= gang_info.respect * 0.15) {
                    ns.print(`Ascending ${member.name}`);
                    ns.gang.ascendMember(member.name);
                }
            }
        }
    }

    #tryBuyEquipment(ns: NS): void {
        for (const member of this.#getTrainedMembers(ns)) {
            for (const upgrade of ns.gang.getEquipmentNames()) {
                if (ns.gang.getEquipmentCost(upgrade) < ns.getServerMoneyAvailable("home") * 0.01) {
                    ns.gang.purchaseEquipment(member.name, upgrade);
                }
            }
        }
    }

    #tryGainTerritory(ns: NS): void {
        if (ns.gang.getMemberNames().length < 12 || this.#getTrainedMembers(ns).length === 0) {
            ns.print("Less than 12 members (or none trained), avoiding war");
            this.#need_power = false;
            ns.gang.setTerritoryWarfare(false);
            return;
        }
        const chances: number[] = [];
        const gangs = ns.gang.getOtherGangInformation();
        for (const gang in gangs) {
            if (gang !== this.#faction && gangs[gang].territory > 0) {
                chances.push(ns.gang.getChanceToWinClash(gang));
            }
        }
        const lowest_clash_chance = chances.length > 0 ? Math.min(...chances) : 1;
        if (lowest_clash_chance >= 0.8) {
            this.#need_power = false;
            if (!ns.gang.getGangInformation().territoryWarfareEngaged) {
                ns.print("All clashes at 80% win, enabling war");
                ns.gang.setTerritoryWarfare(true);
            }
        } else if (lowest_clash_chance <= 0.7 || this.#need_power) {
            ns.print("Regaining power for war");
            this.#need_power = true;
            ns.gang.setTerritoryWarfare(false);
            for (const member of this.#getTrainedMembers(ns)) {
                if (member.task !== this.#tasks.tw) ns.gang.setMemberTask(member.name, this.#tasks.tw);
            }
        }
    }

    #tryCrime(ns: NS): void {
        if (this.#need_power) return;
        const mem_count = ns.gang.getMemberNames().length;
        for (const member of this.#getTrainedMembers(ns)) {
            if (mem_count < 12 && ns.gang.setMemberTask(member.name, this.#tasks.t)) continue;
            else if (member.task !== this.#tasks.ht) ns.gang.setMemberTask(member.name, this.#tasks.ht);
        }
    }

    #getTrainedMembers(ns: NS): GangMemberInfo[] {
        const members = ns.gang.getMemberNames().map(name => ns.gang.getMemberInformation(name));
        return members.filter(m => [m.agi, m.def, m.str, m.dex].every(s => s >= 600));
    }
}