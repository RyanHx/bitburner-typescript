import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    const crime = <string>ns.args[0] ?? "Mug";
    for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
        ns.sleeve.setToCommitCrime(i, crime);
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: AutocompleteData, args: string[]): string[] {
    return ["Homicide", "Mug"]
}//