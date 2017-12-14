import {FILTERnode} from "./FILTERnode";
import {ANode} from "./ANode";
import {FilterJSON} from "../IJSON";
import {Section} from "../Section";
import ArrayUtil from "../../ArrayUtil";
import {Room} from "../Room";

export class LOGICCnode extends ANode {

    filters: Array<FILTERnode>;
    logic: string;

    constructor(filterOn: Array<FilterJSON>, lgc: string) {
        super();

        // get the type of logic (AND or OR) out
        this.logic = lgc;

        // initialize all the filters and keep them in the array
        this.filters = [];

        if (filterOn.length === 0) {
            throw new Error('SYNTAXERR - AND/OR queries must be given filters')

        } else {
            for (let o of filterOn) {
                this.filters.push(new FILTERnode(o))
            }

        }
    }

    evaluate(): Array<Section|Room> {

        let results: Array<Array<Section|Room>> = [];
        let combinedResult: Array<Section|Room> = [];

        // evaluate all the filters
        for (let f of this.filters) {
            results.push(f.evaluate())
        }

        if (this.logic === 'AND') {
            // looking for AND of all the result arrays
            combinedResult = ArrayUtil.intersection(results)

        }

        if (this.logic === 'OR') {
            // looking for OR result from the filters
            combinedResult = ArrayUtil.union(results)

        }

        return combinedResult;

    }

}