import {Section} from "./Section";
import {Room} from "./Room";
import {isNull} from "util";
let Decimal = require('decimal.js');

export class ApplyUtil {
    static max(entries: Array<Section|Room>, onKey: string): number {
        let maxSoFar: number = null;

        for (let e of entries) {
            if (isNull(maxSoFar)) {
                maxSoFar = e[onKey]

            } else {
                if (maxSoFar < e[onKey]) {
                    maxSoFar = e[onKey];
                }
            }
        }

        return maxSoFar;
    }

    static min(entries: Array<Section|Room>, onKey: string): number {
        let minSoFar: number = null;

        for (let e of entries) {
            if (isNull(minSoFar)) {
                minSoFar = e[onKey]

            } else {
                if (minSoFar > e[onKey]) {
                    minSoFar = e[onKey];
                }
            }
        }

        return minSoFar;
    }

    static avg(entries: Array<Section|Room>, onKey: string): number {
        let numsToAvg: Array<number> = [];

        for (let e of entries) {
            numsToAvg.push(e[onKey]);
        }

        let avg: number = Number(
            (numsToAvg.map(val => <any>new Decimal(val)).reduce((a,b) => a.plus(b)).toNumber()/
            numsToAvg.length).toFixed(2));

        return avg;
    }

    static count(entries: Array<Section|Room>, onKey: string): number {
        let seen: Array<any> = [];

        for (let e of entries) {
            if (!seen.includes(e[onKey])) {
                seen.push(e[onKey])
            }
        }

        return seen.length;
    }

    static sum(entries: Array<Section|Room>, onKey: string): number {
        let numsToSum: Array<number> = [];

        for (let e of entries) {
            numsToSum.push(e[onKey]);
        }

        let sum = Number(numsToSum.map(val =>
            new Decimal(val)).reduce((a,b) => a.plus(b)).toNumber().toFixed(2));

        return sum;
    }


}