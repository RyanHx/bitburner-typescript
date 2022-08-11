export class GangManager {
    private member_name_index: number;
    private need_power: boolean;
    //private new_gang: boolean;
    private faction: string;
    private tasks: Record<string, string>;

    constructor(ns: NS) {
        this.member_name_index = 0;
        this.need_power = false;
        this.faction = ns.gang.getGangInformation().faction;
        //this.new_gang = ns.gang.getMemberNames().length <= 3;
        this.tasks = {
            tw: "Territory Warfare",
            vj: "Vigilante Justice",
            ht: "Human Trafficking",
            train_combat: "Train Combat",
            unassign: "Unassigned"
        }
        const names = ns.gang.getMemberNames();
        names.forEach(name => {
            try {
                const index = parseInt(name);
                this.member_name_index = Math.max(this.member_name_index, index);
            } catch {/* */ }
        });
        this.member_name_index++;
    }

    async process(ns: NS): Promise<void> {
        //if (this.new_gang) await this.tryEarlyRecruitment(ns);
        if (ns.gang.recruitMember(`${this.member_name_index}`)) this.member_name_index++;
        this.tryAscend(ns);
        this.tryTrain(ns);
        this.tryBuyEquipment(ns);
        this.tryGainTerritory(ns);
        this.tryTraffick(ns);
    }

    private tryTrain(ns: NS) {
        const members = ns.gang.getMemberNames().map(name => ns.gang.getMemberInformation(name));
        for (const member of members) {
            const lowest_stat = Math.min(member.str, member.agi, member.def, member.dex);
            if (lowest_stat < 600 && member.task !== this.tasks.train_combat) ns.gang.setMemberTask(member.name, this.tasks.train_combat);
            //else if (lowest_stat >= 600 && member.task == this.tasks.train_combat) ns.gang.setMemberTask(member.name, this.tasks.unassign);
        }
    }

    private tryAscend(ns: NS) {
        const members = ns.gang.getMemberNames().map(name => ns.gang.getMemberInformation(name));
        for (const member of members) {
            const ascension = ns.gang.getAscensionResult(member.name);
            if (ascension) {
                const highest_asc_result = Math.max(ascension.agi, ascension.def, ascension.dex, ascension.str);
                const lowest_asc_mult = Math.min(member.agi_asc_mult, member.def_asc_mult, member.dex_asc_mult, member.str_asc_mult);
                const valid_asc_mult = (lowest_asc_mult < 8 && highest_asc_result >= 1.2) || (lowest_asc_mult >= 8 && highest_asc_result >= 1.01);
                const gang_info = ns.gang.getGangInformation();
                if (valid_asc_mult && member.earnedRespect <= gang_info.respect * 0.15) ns.gang.ascendMember(member.name);
            }
        }
    }

    private tryBuyEquipment(ns: NS) {
        for (const member of this.getTrainedMembers(ns)) {
            for (const upgrade of ns.gang.getEquipmentNames()) {
                if (ns.gang.getEquipmentCost(upgrade) < ns.getServerMoneyAvailable("home") * 0.01) {
                    ns.gang.purchaseEquipment(member.name, upgrade);
                }
            }
        }
    }

    // private async tryEarlyRecruitment(ns: NS) {
    //     for (let i = 0; i < 3; i++) {
    //         if (ns.gang.recruitMember(`${this.member_name_index}`)) this.member_name_index++;
    //     }
    //     while (this.getTrainedMembers(ns).length < 3) {
    //         ns.print("Waiting for 3 trained members");
    //         this.tryTrain(ns);
    //         await ns.sleep(5e3);
    //     }
    //     for (const member of this.getTrainedMembers(ns)) {
    //         ns.gang.setMemberTask(member.name, this.tasks.ht);
    //     }
    //     for (let i = 0; i < 3; i++) {
    //         while (!ns.gang.recruitMember(`${this.member_name_index}`)) {
    //             ns.print(`Waiting to recruit ${4 + i}th member`);
    //             await ns.sleep(5e3);
    //         }
    //         ns.gang.setMemberTask(`${this.member_name_index}`, this.tasks.train_combat);
    //         this.member_name_index++;
    //     }
    //     this.new_gang = false;
    // }

    private tryGainTerritory(ns: NS) {
        if (ns.gang.getMemberNames().length < 12 || this.getTrainedMembers(ns).length === 0) {
            this.need_power = false;
            ns.gang.setTerritoryWarfare(false);
            return;
        }
        const chances: number[] = [];
        const gangs = ns.gang.getOtherGangInformation();
        for (const gang in gangs) {
            if (gang !== this.faction && gangs[gang].territory > 0) {
                chances.push(ns.gang.getChanceToWinClash(gang));
            }
        }
        const lowest_clash_chance = chances.length > 0 ? Math.min(...chances) : 1;
        if (lowest_clash_chance >= 0.8) {
            this.need_power = false;
            ns.gang.setTerritoryWarfare(true);
        } else if (lowest_clash_chance <= 0.7 || this.need_power) {
            this.need_power = true;
            ns.gang.setTerritoryWarfare(false);
            for (const member of this.getTrainedMembers(ns)) {
                if (member.task !== this.tasks.tw) ns.gang.setMemberTask(member.name, this.tasks.tw);
            }
        }
    }

    private tryTraffick(ns: NS) {
        if (this.need_power) return;
        for (const member of this.getTrainedMembers(ns)) {
            if (member.task !== this.tasks.ht) ns.gang.setMemberTask(member.name, this.tasks.ht);
        }
    }

    private getTrainedMembers(ns: NS) {
        const members = ns.gang.getMemberNames().map(name => ns.gang.getMemberInformation(name));
        return members.filter(m => [m.agi, m.def, m.str, m.dex].every(s => s >= 600));
    }
}

