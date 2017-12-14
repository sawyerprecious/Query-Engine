import {FILTERnode} from "./FILTERnode";
import {ANode} from "./ANode";
import {FilterJSON} from "../IJSON";
import {Section} from "../Section";
import {Database} from "../Database";
import {Room} from "../Room";

export class NEGnode extends ANode {

    filter: FILTERnode;

    constructor(f: FilterJSON) {
        super();

        // initialize the filter to be negated
        this.filter = new FILTERnode(f)
    }

    evaluate(): Array<Section|Room> {
        let result = this.filter.evaluate();
        let db = new Database();

        let antiresult = db.getOpposite(result);

        return antiresult;
    }

}