import { NS } from "@ns";

export interface Manager {
    all_cities: string[];
    division: string;
    main_city: string;
    process(ns: NS): Promise<void> | void;
}