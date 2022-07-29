import { NS } from '@ns'
import { Manager } from '/corp/manager';
import { calcMaterials } from '/corp/production';

export class WarehouseManager implements Manager {
    readonly all_cities: string[] = ["aevum", "chongqing", "sector-12", "new Tokyo", "ishima", "volhaven"];
    readonly division: string;
    readonly main_city = "Aevum";
    private readonly product_prices: Record<string, ProductPrices> = {}
    private last_prod_mp_mult: number;
    private prod_index: number;

    constructor(ns: NS, division: string) {
        this.division = division;
        this.prod_index = 0;
        this.last_prod_mp_mult = 1;
        const div_obj = ns.corporation.getDivision(this.division);
        if (div_obj.products.length > 0) {
            const prods = div_obj.products.map(prod_name => ns.corporation.getProduct(this.division, prod_name));
            for (const prod of prods) {
                this.product_prices[prod.name] = new ProductPrices();
                if (prod.name.startsWith("prod-")) this.prod_index = parseInt(prod.name.substring(5)) + 1;
                let sell_price = 1;
                if (typeof prod.sCost === 'string') {
                    sell_price = parseInt(prod.sCost.substring(3));
                } else {
                    sell_price = prod.sCost;
                }
                this.product_prices[prod.name].curr_mp_mult = sell_price;
                this.last_prod_mp_mult = Math.max(this.last_prod_mp_mult, sell_price);
            }
        }
    }

    process(ns: NS): void {
        this.tryExpand(ns);
        this.tryBuyWarehouses(ns);
        this.tryUpgradeWarehouses(ns);
        this.tryCreateProduct(ns);
        this.tryPriceProducts(ns);
        this.tryBuyBoostMats(ns);
    }

    private tryExpand(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        if (division.cities.length === 6) return;
        const new_cities = this.all_cities.filter(city => !division.cities.map(div_city => div_city.toLowerCase()).includes(city));
        while (ns.corporation.getCorporation().funds > ns.corporation.getExpandCityCost()) {
            if (new_cities.length === 0) break;
            ns.corporation.expandCity(division.name, <string>new_cities.pop());
        }
    }

    private tryBuyWarehouses(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        const div_profit = division.lastCycleRevenue - division.lastCycleExpenses;
        for (const city of division.cities) {
            if (ns.corporation.hasWarehouse(division.name, city)) continue;
            if (div_profit * 0.1 > ns.corporation.getPurchaseWarehouseCost()) {
                ns.corporation.purchaseWarehouse(division.name, city);
            }
        }
    }

    private tryUpgradeWarehouses(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        const div_profit = division.lastCycleRevenue - division.lastCycleExpenses;
        for (const city of division.cities) {
            if (!ns.corporation.hasWarehouse(division.name, city)) continue;
            const upgrade_cost = ns.corporation.getUpgradeWarehouseCost(division.name, city);
            if (div_profit * 0.1 > upgrade_cost) {
                ns.corporation.upgradeWarehouse(division.name, city);
            }
        }
    }

    private tryBuyBoostMats(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        const div_profit = division.lastCycleRevenue - division.lastCycleExpenses;
        const names = ["Hardware", "Robots", "AI Cores", "Real Estate"];
        for (const city of division.cities) {
            if (!ns.corporation.hasWarehouse(division.name, city)) continue;
            const warehouse = ns.corporation.getWarehouse(division.name, city);
            const mat_counts = calcMaterials(division.type, warehouse.size * 0.9);
            if (!mat_counts) continue;
            for (const material of names) {
                const city_mat_stock = ns.corporation.getMaterial(division.name, city, material);
                const req_amount = mat_counts[material] - city_mat_stock.qty
                if (req_amount > 0 && div_profit * 0.1 > city_mat_stock.cost * req_amount) {
                    ns.corporation.buyMaterial(division.name, city, material, req_amount / 10);
                } else {
                    ns.corporation.buyMaterial(division.name, city, material, 0);
                }
            }
        }
    }

    private tryCreateProduct(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        if (!division.makesProducts) return;
        const current_prods = division.products.map(product => ns.corporation.getProduct(division.name, product));
        if (current_prods.some(product => product.developmentProgress < 100)) return;
        if (current_prods.length === 3) {
            const lowest_prod = current_prods.sort((a, b) => a.rat - b.rat)[0].name;
            ns.corporation.discontinueProduct(division.name, lowest_prod);
            delete this.product_prices[lowest_prod];
        }
        const prod_investment = ns.corporation.getCorporation().funds * 0.05
        const new_prod_name = `prod-${this.prod_index++}`;
        ns.corporation.makeProduct(division.name, this.main_city, new_prod_name, prod_investment / 2, prod_investment / 2);
        this.product_prices[new_prod_name] = new ProductPrices();
        this.product_prices[new_prod_name].curr_mp_mult = this.last_prod_mp_mult;
    }

    private tryPriceProducts(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        if (!division.makesProducts) return;
        const current_prods = division.products.map(product => ns.corporation.getProduct(division.name, product));
        for (const product of current_prods) {
            if (!product || product.developmentProgress < 100) continue;
            for (const city of division.cities) {
                if (product.cityData[city][1] > product.cityData[city][2]) {
                    // production > sold
                    this.product_prices[product.name].curr_mp_mult -= 5;
                    this.product_prices[product.name].max_mp_mult = this.product_prices[product.name].curr_mp_mult;
                } else if (this.product_prices[product.name].curr_mp_mult + 10 < this.product_prices[product.name].max_mp_mult) {
                    this.product_prices[product.name].curr_mp_mult = this.product_prices[product.name].curr_mp_mult + 10;
                }
                ns.corporation.sellProduct(division.name, city, product.name, "MAX", `MP*${this.product_prices[product.name].curr_mp_mult}`, true);
            }
            if (this.product_prices[product.name].curr_mp_mult > this.last_prod_mp_mult) {
                this.last_prod_mp_mult = this.product_prices[product.name].curr_mp_mult;
            }
        }
    }
}

class ProductPrices {
    curr_mp_mult = 1;
    max_mp_mult = Number.MAX_SAFE_INTEGER - 10;
}
// export async function main(ns: NS): Promise<void> {
//     //
// }