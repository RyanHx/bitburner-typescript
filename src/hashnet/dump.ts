import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    while (ns.hacknet.numHashes() >= 4) {
        ns.hacknet.spendHashes("Sell for Money");
    }
}