import { NS } from '@ns'
import { getServerConnRoute } from '/utils/locate';

export async function main(ns: NS): Promise<void> {
    const data = ns.flags([['F', false]]);
    const root = ns.run("/utils/root.js");
    while (ns.isRunning(root)) await ns.sleep(50);
    const servs = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"];
    for (const serv of servs) {
        const target = ns.getServer(serv);
        if (target.backdoorInstalled || target.requiredHackingSkill > ns.getHackingLevel()) continue;
        for (const step of getServerConnRoute(ns, serv)) {
            ns.singularity.connect(step);
        }
        ns.tprint(`Installing backdoor on ${serv}.`);
        try {
            await ns.singularity.installBackdoor();
        } catch { ns.tprint("Failed.") }
    }
    ns.singularity.connect("home");
    if (<boolean>data.F === true) return;
    const faction_servs: Record<string, string> = { "CyberSec": "CSEC", "NiteSec": "avmnite-02h", "The Black Hand": "I.I.I.I", "BitRunners": "run4theh111z" };
    const not_joined_facts = Object.keys(faction_servs).filter(faction => !ns.getPlayer().factions.includes(faction) && ns.getServer(faction_servs[faction]).backdoorInstalled);
    if (not_joined_facts.length > 0) {
        ns.tprint("Waiting for faction invites.");
        while (not_joined_facts.some(faction => !ns.getPlayer().factions.includes(faction))) {
            await ns.sleep(100);
            for (const faction of not_joined_facts) {
                if (ns.singularity.joinFaction(faction)) ns.tprint(`Joined ${faction}`);
            }
        }
    }
    ns.tprint("Joined all possible story factions.");
}