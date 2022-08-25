import { NS } from "@ns";

const names = ["Hardware", "Robots", "AI Cores", "Real Estate"];
const size = [0.06, 0.5, 0.1, 0.005];

const permutations = [
    [1, 1, 1, 1],
    [0, 1, 1, 1],
    [1, 0, 1, 1],
    [1, 1, 0, 1],
    [1, 1, 1, 0],
    [0, 0, 1, 1],
    [0, 1, 0, 1],
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 1, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 1],
    [0, 0, 1, 0],
    [0, 1, 0, 0],
    [1, 0, 0, 0],
];

export function calcMaterials(industry: string, inventory: number): Record<string, number> | null {
    let pows;
    switch (industry.toLowerCase()) {
        case "energy": { pows = [0.00, 0.05, 0.30, 0.65]; } break;
        case "utilities": { pows = [0.00, 0.40, 0.40, 0.50]; } break;
        case "agriculture": { pows = [0.20, 0.30, 0.30, 0.72]; } break;
        case "fishing": { pows = [0.35, 0.50, 0.20, 0.15]; } break;
        case "mining": { pows = [0.40, 0.45, 0.45, 0.30]; } break;
        case "food": { pows = [0.15, 0.30, 0.25, 0.05]; } break;
        case "tobacco": { pows = [0.15, 0.20, 0.15, 0.15]; } break;
        case "chemical": { pows = [0.20, 0.25, 0.20, 0.25]; } break;
        case "pharmaceutical": { pows = [0.15, 0.25, 0.20, 0.05]; } break;
        case "computer": { pows = [0.00, 0.36, 0.19, 0.20]; } break;
        case "robotics": { pows = [0.19, 0.00, 0.36, 0.32]; } break;
        case "software": { pows = [0.25, 0.05, 0.18, 0.15]; } break;
        case "healthcare": { pows = [0.10, 0.10, 0.10, 0.10]; } break;
        case "realestate":
        case "real estate": { pows = [0.05, 0.60, 0.60, 0.00]; } break;
        default: { return null; }
    }

    const ret: Record<string, number> = {
        "Hardware": 0,
        "Robots": 0,
        "AI Cores": 0,
        "Real Estate": 0,
        multiplier: 1
    };

    for (const perm of permutations) {
        let psum = 0;
        let ssum = 0;
        for (let i = 0; i < 4; ++i) {
            psum += pows[i] * perm[i];
            ssum += size[i] * perm[i];
        }

        const x = [0, 0, 0, 0];
        for (let i = 0; i < 4; ++i) {
            x[i] = perm[i] * ((pows[i] * (500 * ssum + inventory)) / (size[i] * psum) - 500);
        }

        if (x[0] < 0 || x[1] < 0 || x[2] < 0 || x[3] < 0) { continue; }

        const mult = Math.pow((1 + x[0] / 500), pows[0] * 0.73)
            * Math.pow((1 + x[1] / 500), pows[1] * 0.73)
            * Math.pow((1 + x[2] / 500), pows[2] * 0.73)
            * Math.pow((1 + x[3] / 500), pows[3] * 0.73)

        if (mult > ret.multiplier) {
            ret.multiplier = mult;
            for (let i = 0; i < 4; ++i) { ret[names[i]] = x[i]; }
        }
    }

    return ret;
}

export function autocomplete(): string[] {
    return ["Energy", "Utilities", "Agriculture", "Fishing", "Mining", "Food",
        "Tobacco", "Chemical", "Pharmaceutical", "Computer", "Robotics",
        "Software", "Healthcare", "RealEstate"];
}

export async function main(ns: NS): Promise<void> {
    if (ns.args.length == 0) {
        ns.tprintf("Usage: production.js industry inventory");
        return;
    }

    const industry = String(ns.args[0]);
    const inventory = Number(ns.args[1] ?? 1000);
    const materials = calcMaterials(industry, inventory);

    if (materials == null) {
        ns.tprintf("ERROR: Invalid industry %s", industry);
        return;
    }

    ns.tprintf("%s Production: %.1fx", industry, materials.multiplier)
    for (let i = 0; i < 4; ++i) {
        ns.tprintf("%11s %9.1f (Inventory space: %7.1f)",
            names[i], materials[names[i]], size[i] * materials[names[i]]);
    }
}