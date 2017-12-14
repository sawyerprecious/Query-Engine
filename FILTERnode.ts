import {LOGICCnode} from "./LOGICCnode";
import {MCnode} from "./MCnode";
import {SCnode} from "./SCnode";
import {NEGnode} from "./NEGnode";
import {FilterJSON} from "../IJSON";
import {isNull, isUndefined} from "util";
import {ANode} from "./ANode";
import {Section} from "../Section";
import {Room} from "../Room";
import {Database} from "../Database";

export class FILTERnode extends ANode {
    criteria: LOGICCnode | MCnode | SCnode | NEGnode;

    constructor(filter: FilterJSON) {
        super();

        // get the type of filter out of the object
        let key = Object.keys(filter)[0];

        switch (key) {
            // switch on the filter type and construct it

            case 'OR':
            case 'AND':
                this.criteria = new LOGICCnode(filter[key], key);
                break;

            case 'LT':
            case 'GT':
            case 'EQ':
                this.criteria = new MCnode(filter[key], key);
                break;

            case 'IS':
                this.criteria = new SCnode(filter[key]);
                break;

            case 'NOT':
                this.criteria = new NEGnode(filter[key]);
                break;

            default:
                if (isUndefined(key)){
                    // query is empty; will return all
                    this.criteria = null;
                    break;
                }
                throw new Error('SYNTAXERR - some FILTER query is poorly formed');

        }
    }

    evaluate(): Array<Section|Room> {
        let result: Array<Section|Room>;
        if (!isNull(this.criteria)){
            // tree was constructed and query exists; evaluate
            result = this.criteria.evaluate();

        } else {
            // query was empty; return ALL
            let db = new Database();
            result = db.query(null);
        }

        return result

    }

}