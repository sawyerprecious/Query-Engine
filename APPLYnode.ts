import {APPLYKEYnode} from "./APPLYKEYnode";
import {QueryEngine} from "../QueryEngine";

export class APPLYnode {
    applyKeyNodes: Array<APPLYKEYnode>;

    constructor(userDefinedCriteria: any) {

        // initialize all the apply keys and store them in the array
        this.applyKeyNodes = [];

        for (let c of userDefinedCriteria) {
            this.applyKeyNodes.push(new APPLYKEYnode(c))
        }

        // check if the user-defined apply keys are unique
        let userDefinedKeys: Array<string> = [];

        for (let applyKey of this.applyKeyNodes) {
            if (userDefinedKeys.includes(applyKey.userDefinedKey)) {
                throw new Error('SYNTAXERR - user defined key "' + applyKey.userDefinedKey +
                    '" is not unique')
            } else {
                userDefinedKeys.push(applyKey.userDefinedKey);
            }
        }
    }

    evaluate(group: any): any {
        let applyResults: Array<any> = [];
        let partialResult: any = {};

        // run the apply
        for (let applyKeyNode of this.applyKeyNodes) {
            // evaluate the partial result object with the user-defined key and its calculated value
            applyResults.push(applyKeyNode.evaluate(group));
        }

        // build each apply result into the group
        for (let aResult of applyResults) {
            let applyKey = Object.keys(aResult)[0];
            let applyVal = aResult[applyKey];
            partialResult[applyKey] = applyVal;
        }

        // complete the partial result with the keys that define this group
        for (let key of Object.keys(group)) {
            if (QueryEngine.isGoodKey(key)) {
                partialResult[key] = group[key];
            }
        }

        if (this.applyKeyNodes.length === 0){
            return group;
        }

        return partialResult;
    }

}