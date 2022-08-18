import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
        //ns.sleeve.get
        ns.sleeve.setToCommitCrime(i, "Homicide");
    }
}