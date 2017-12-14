
import {isNull} from "util";
import {Section} from "../Section";
import {Room} from "../Room";
import {ApplyUtil} from "../ApplyUtil";
import {QueryEngine} from "../QueryEngine";

export class APPLYKEYnode {
    userDefinedKey: string;
    applyFn: string; // one of MAX/MIN...
    onKey: string;

    constructor(criteria: any) {

        // extract the relevant values
        this.userDefinedKey = Object.keys(criteria)[0];

        this.applyFn = Object.keys(criteria[this.userDefinedKey])[0];

        this.onKey = criteria[this.userDefinedKey][this.applyFn];

        if (isNull(this.userDefinedKey) ||
            isNull(this.applyFn) ||
            isNull(this.onKey)
        ) {
            throw new Error('SYNTAXERR - APPLYKEY malformed: ' + criteria)
        }

        switch (this.applyFn) {
            case "MAX":
            case "MIN":
            case "AVG":
            case "SUM":
                // key must be numerical
                if (!QueryEngine.isGoodKey(this.onKey)) {
                    throw new Error('SYNTAXERR - "' + this.onKey + '" is an invalid key')

                } else if (!QueryEngine.isNumberKey(this.onKey)) {
                    throw new Error('SYNTAXERR - MAX/MIN/AVG/SUM can only be performed on numerical keys')
                }

                break;

            case "COUNT":
                // key can be string or number
                if (!QueryEngine.isGoodKey(this.onKey)) {
                    throw new Error('SYNTAXERR - "' + this.onKey + '" is an invalid key')
                }

                break;

            default:
                // apply function is not one of the five
                throw new Error('SYNTAXERR - "' + this.applyFn + '" is not one of MAX/MIN/AVG/SUM/COUNT')
        }
    }

    evaluate(group: any): any {
        let workingEntries: Array<Section|Room> = group.groupContents;
        let applyValue: number;

        switch (this.applyFn) {
            case "MAX": applyValue = ApplyUtil.max(workingEntries, this.onKey); break;
            case "MIN": applyValue = ApplyUtil.min(workingEntries, this.onKey); break;
            case "AVG": applyValue = ApplyUtil.avg(workingEntries, this.onKey); break;
            case "COUNT": applyValue = ApplyUtil.count(workingEntries, this.onKey); break;
            case "SUM": applyValue = ApplyUtil.sum(workingEntries, this.onKey); break;
        }

        return {
            [this.userDefinedKey]: applyValue
        }
    }
}