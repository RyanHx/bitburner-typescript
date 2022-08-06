import { Player, Server } from "/../NetscriptDefinitions";

const CONSTANTS = {
    ServerBaseGrowthRate: 1.03,
    ServerMaxGrowthRate: 1.0035
};

const BitNodeMultipliers = {
    ServerGrowthRate: 1
};
/**
 * This function calculates the number of threads needed to grow a server from one $amount to a higher $amount
 * (ie, how many threads to grow this server from $200 to $600 for example). Used primarily for a formulas (or possibly growthAnalyze)
 * type of application. It lets you "theorycraft" and easily ask what-if type questions. It's also the one that implements the
 * main thread calculation algorithm, and so is the function all helper functions should call.
 * It protects the inputs (so putting in INFINITY for targetMoney will use moneyMax, putting in a negative for start will use 0, etc.)
 * @param {Server} server - Server being grown
 * @param targetMoney - How much you want the server grown TO (not by), for instance, to grow from 200 to 600, input 600
 * @param startMoney - How much you are growing the server from, for instance, to grow from 200 to 600, input 200
 * @param p - Reference to Player object
 * @returns Number of "growth cycles" needed
 */
export function numCycleForGrowthCorrected(
    server: Server,
    targetMoney: number,
    startMoney: number,
    p: Player,
    cores = 1): number {
    if (startMoney < 0) {
        startMoney = 0;
    } // servers "can't" have less than 0 dollars on them
    if (targetMoney > server.moneyMax) {
        targetMoney = server.moneyMax;
    } // can't grow a server to more than its moneyMax
    if (targetMoney <= startMoney) {
        return 0;
    } // no growth --> no threads

    // exponential base adjusted by security
    const adjGrowthRate = 1 + (CONSTANTS.ServerBaseGrowthRate - 1) / server.hackDifficulty;
    const exponentialBase = Math.min(adjGrowthRate, CONSTANTS.ServerMaxGrowthRate); // cap growth rate

    // total of all grow thread multipliers
    const serverGrowthPercentage = server.serverGrowth / 100.0;
    const coreMultiplier = 1 + (cores - 1) / 16;
    const threadMultiplier =
        serverGrowthPercentage * p.mults.hacking_grow * coreMultiplier * BitNodeMultipliers.ServerGrowthRate;

    const x = threadMultiplier * Math.log(exponentialBase);
    const y = startMoney * x + Math.log(targetMoney * x);
    /* Code for the approximation of lambert's W function is adapted from
     * https://git.savannah.gnu.org/cgit/gsl.git/tree/specfunc/lambert.c
     * using the articles [1] https://doi.org/10.1007/BF02124750 (algorithm above)
     * and [2] https://doi.org/10.1145/361952.361970 (initial approximation when x < 2.5)
     */
    let w;
    if (y < Math.log(2.5)) {
        /* exp(y) can be safely computed without overflow.
         * The relative error on the result is better when exp(y) < 2.5
         * using Padé rational fraction approximation [2](5)
         */
        const ey = Math.exp(y);
        w = (ey + (4 / 3) * ey * ey) / (1 + (7 / 3) * ey + (5 / 6) * ey * ey);
    } else {
        /* obtain initial approximation from rough asymptotic [1](4.18)
         * w = y [- log y when 0 <= y]
         */
        w = y;
        if (y > 0) w -= Math.log(y);
    }
    let cycles = w / x - startMoney;

    const bt = exponentialBase ** threadMultiplier;
    let corr = Infinity;
    // Two sided error because we do not want to get stuck if the error stays on the wrong side
    do {
        // c should be above 0 so Halley's method can't be used, we have to stick to Newton-Raphson
        const bct = bt ** cycles;
        const opc = startMoney + cycles;
        const diff = opc * bct - targetMoney;
        corr = diff / (opc * x + 1.0) / bct;
        cycles -= corr;
    } while (Math.abs(corr) >= 1);
    /* c is now within +/- 1 of the exact result.
     * We want the ceiling of the exact result, so the floor if the approximation is above,
     * the ceiling if the approximation is in the same unit as the exact result,
     * and the ceiling + 1 if the approximation is below.
     */
    const fca = Math.floor(cycles);
    if (targetMoney <= (startMoney + fca) * Math.pow(exponentialBase, fca * threadMultiplier)) {
        return fca;
    }
    const cca = Math.ceil(cycles);
    if (targetMoney <= (startMoney + cca) * Math.pow(exponentialBase, cca * threadMultiplier)) {
        return cca;
    }
    return cca + 1;
}