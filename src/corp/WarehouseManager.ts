import { NS } from '@ns'
import { Manager } from '/corp/manager';
import { calcMaterials } from '/corp/production';

export class WarehouseManager implements Manager {
    readonly all_cities: string[] = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
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
                if (typeof prod.sCost === 'string' && prod.sCost.startsWith("MP*")) {
                    sell_price = parseInt(prod.sCost.substring(3));
                } else {
                    sell_price = <number>prod.sCost;
                }
                this.product_prices[prod.name].curr_mp_mult = sell_price;
                this.last_prod_mp_mult = Math.max(this.last_prod_mp_mult, sell_price);
            }
        }
    }

    process(ns: NS): void {
        this.tryBuyWarehouses(ns);
        this.tryUpgradeWarehouses(ns);
        this.tryCreateProduct(ns);
        this.tryPriceProducts(ns);
        this.tryPriceMaterials(ns);
        this.tryBuyBoostMats(ns);
    }

    private tryBuyWarehouses(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        for (const city of division.cities) {
            if (ns.corporation.hasWarehouse(division.name, city)) continue;
            if (ns.corporation.getCorporation().funds > ns.corporation.getPurchaseWarehouseCost()) {
                ns.corporation.purchaseWarehouse(division.name, city);
            }
        }
    }

    private tryUpgradeWarehouses(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        for (const city of division.cities) {
            if (!ns.corporation.hasWarehouse(division.name, city)) continue;
            ns.corporation.setSmartSupply(division.name, city, true);
            //ns.corporation.setSmartSupplyUseLeftovers(division.name,city,)
            const upgrade_cost = ns.corporation.getUpgradeWarehouseCost(division.name, city);
            if (ns.corporation.getCorporation().funds * 0.001 > upgrade_cost) {
                ns.corporation.upgradeWarehouse(division.name, city);
            }
        }
    }

    private tryBuyBoostMats(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        const names = ["Hardware", "Robots", "AI Cores", "Real Estate"];
        for (const city of division.cities) {
            if (!ns.corporation.hasWarehouse(division.name, city)) continue;
            const warehouse = ns.corporation.getWarehouse(division.name, city);
            const mat_counts = calcMaterials(division.type, warehouse.size * 0.7);
            if (!mat_counts) continue;
            for (const material of names) {
                const city_mat_stock = ns.corporation.getMaterial(division.name, city, material);
                const req_amount = mat_counts[material] - city_mat_stock.qty
                if (req_amount > 0 && ns.corporation.getCorporation().funds * 0.01 > city_mat_stock.cost * req_amount) {
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
            if (ns.corporation.hasResearched(division.name, "Market-TA.II")) {
                ns.corporation.sellProduct(division.name, Object.keys(product.cityData)[0], product.name, "MAX", "MP", true);
                ns.corporation.setProductMarketTA2(division.name, product.name, true);
                continue;
            }
            if (product.sCost == 0) {
                this.product_prices[product.name].curr_mp_mult = this.last_prod_mp_mult;
            } else {
                for (const city of division.cities) {
                    if (product.cityData[city][1] - product.cityData[city][2] > 0.002) {
                        // production > sold
                        this.product_prices[product.name].curr_mp_mult -= 5;
                        this.product_prices[product.name].max_mp_mult = this.product_prices[product.name].curr_mp_mult;
                        break;
                    }
                }
            }
            if (this.product_prices[product.name].curr_mp_mult + 10 < this.product_prices[product.name].max_mp_mult) {
                this.product_prices[product.name].curr_mp_mult = this.product_prices[product.name].curr_mp_mult + 10;
            }
            ns.corporation.sellProduct(division.name, Object.keys(product.cityData)[0], product.name, "MAX", `MP*${this.product_prices[product.name].curr_mp_mult}`, true);
            if (this.product_prices[product.name].curr_mp_mult > this.last_prod_mp_mult) {
                this.last_prod_mp_mult = this.product_prices[product.name].curr_mp_mult;
            }
        }
    }

    private tryPriceMaterials(ns: NS) {
        const division = ns.corporation.getDivision(this.division);
        const materials = ["Water", "Energy", "Food", "Plants", "Metal", "Hardware", "Chemicals", "Drugs", "Robots", "AI Cores", "Real Estate"];
        for (const city of division.cities) {
            for (const material of materials) {
                try {
                    const city_mat = ns.corporation.getMaterial(division.name, city, material);
                    if (city_mat.prod > 1) {
                        ns.corporation.buyMaterial(division.name, city, material, 0);
                        ns.corporation.setSmartSupplyUseLeftovers(division.name, city, material, false);
                        ns.corporation.sellMaterial(division.name, city, material, "PROD", "MP");
                        if (ns.corporation.hasResearched(division.name, "Market-TA.II")) {
                            ns.corporation.setMaterialMarketTA2(division.name, city, material, true);
                        }
                    } else {
                        ns.corporation.sellMaterial(division.name, city, material, "0", "0");
                    }
                } catch {/**Material not in industry */ }
            }
        }
    }
}

class ProductPrices {
    curr_mp_mult = 1;
    max_mp_mult = Number.MAX_SAFE_INTEGER - 10;
}