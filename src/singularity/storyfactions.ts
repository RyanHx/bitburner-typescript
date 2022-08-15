import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    const faction_servs = { "CyberSec": "CSEC", "NiteSec": "avmnite-02h", "The Black Hand": "I.I.I.I", "BitRunners": "run4theh111z" };
    const not_joined_facts = Object.keys(faction_servs).filter(faction => !ns.getPlayer().factions.includes(faction) && ns.getServer(faction_servs[faction]).backdoorInstalled);
    if (not_joined_facts.length === 0) return;
    while (not_joined_facts.some(faction => !ns.getPlayer().factions.includes(faction))) {
        await ns.sleep(100);
        for (const faction of not_joined_facts) {
            ns.singularity.joinFaction(faction);
        }
    }
}