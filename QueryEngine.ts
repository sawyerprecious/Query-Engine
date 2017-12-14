import {Section} from "./Section";
import {FilterJSON, QueryJSON, TransformJSON} from "./IJSON";
import {FILTERnode} from "./nodes/FILTERnode";
import {ResultSection} from "./ResultSection";
import {Database} from "./Database";
import {Room} from "./Room";
import {ResultRoom} from "./ResultRoom";
import {APPLYnode} from "./nodes/APPLYnode";
import {isNullOrUndefined, isUndefined} from "util";

export class QueryEngine {

    parse(query: QueryJSON): JSON {

        // check fundamental syntax structure for WHERE and OPTIONS in the root
        let objKeys: Array<string> = Object.keys(query);

        this.checkQueryStructure(objKeys);

        // prepare the database for the query
        let queryType: string = QueryEngine.extractDatatype(query);

        this.prepareDatabase(queryType, query);

        // get the results that match the query based on FILTER
        let results: Array<Section|Room> = this.getMatch(query.WHERE);

        if (results.length === 0) {
            // no results were returned
            return QueryEngine.encapsulate([]);
        }

        // transform the results based on TRANSFORMATIONS
        if (objKeys.includes('TRANSFORMATIONS')){
            results = this.transformMatch(query.TRANSFORMATIONS, results);
        }

        // format the results based on OPTIONS
        let fResults: Array<ResultSection|ResultRoom> = this.formatMatch(query.OPTIONS, queryType, results);

        // return the results in the form of an InsightResponse
        return QueryEngine.encapsulate(fResults);

    }

    // confirm the correct fundamental sections of the query are intact
    private checkQueryStructure(objKeys: Array<string>) {
        if (objKeys.length === 3) {
            if (!objKeys.includes('TRANSFORMATIONS') || // doesn't include .TRANSFORMATIONS
                !objKeys.includes('WHERE') || // doesn't include .WHERE
                !objKeys.includes('OPTIONS') // doesn't include .OPTIONS
            ) {
                throw new Error('SYNTAXERR - query fundamentally malformed: one of ' + objKeys + ' is invalid')
            }

        } else if (objKeys.length === 2) {
            if (!objKeys.includes('WHERE') || // doesn't include .WHERE
                !objKeys.includes('OPTIONS') // doesn't include .OPTIONS
            ) {
                throw new Error('SYNTAXERR - query fundamentally malformed: one of ' + objKeys + ' is invalid')
            }

        } else {
            throw new Error('SYNTAXERR - query fundamentally malformed: one of ' + objKeys + ' is invalid')

        }
    }

    // clear the database and restore the relevant dataset from cache
    private prepareDatabase(queryType: string, query: any) {
        let db = new Database();
        db.reset('all');

        // COLUMNS will always indicate what datatype is being queried; extract from here
        let colKeys: Array<string> = query.OPTIONS.COLUMNS;

        if (isNullOrUndefined(colKeys)) {
            throw new Error('SYNTAXERR - COLUMNS is not defined')
        } else if (queryType === 'courses') {
            db.loadDB('courses')
        } else if (queryType === 'rooms') {
            db.loadDB('rooms')
        }
    }

    /**
     * Parses the query by building an AST and evaluates with recursion
     * @param {FilterJSON} criteria is a JSON object that specifies the filters by which
     *  sections should be selected
     * @returns {Array<Section>} as an array of Section objects which pass all filter specifications
     */
    private getMatch(criteria: FilterJSON): Array<Section|Room> {
        // build the filters AST rooted on a FILTERnode

        let db = new Database();
        if (db.countEntries() === 0){
            throw new Error('DATASETERR - missing dataset')
        }

        let root: FILTERnode;
        let result: Array<Section|Room>;

        root = new FILTERnode(criteria);
        result = root.evaluate();

        // reset the query-type
        db.resetQuery();

        return result;

    }

    /**
     *
     * @param {TransformJSON} transformation
     * @param {Array<Section | Room>} rawResults
     * @returns {Array<Section | Room>}
     */
    private transformMatch(transformation: TransformJSON,
                           rawResults: Array<Section|Room>
    ): Array<Section|Room> {
        let groups: Array<Array<any>> = [];
        let transformedGroups: Array<any> = [];

        // check syntax of transformation clause
        let groupCriteria: Array<string> = transformation.GROUP;
        let applyCriteria: any = transformation.APPLY;

        if (isUndefined(groupCriteria)) {
            throw new Error('SYNTAXERR - no GROUP defined in transformation')
        } else if (isUndefined(applyCriteria)) {
            throw new Error('SYNTAXERR - no APPLY defined in transformation')
        }

        // evaluate groups and store them in an array
        groups = QueryEngine.createGroups(rawResults, groupCriteria);

        // "apply" to each group and store results
        let root: APPLYnode = new APPLYnode(applyCriteria);

        for (let g of groups) {
            transformedGroups.push(root.evaluate(g));

        }

        return transformedGroups;
    }

    /**
     * Format helper to extract relevant columns from course sections that passed filters
     * @param OPTIONS is JSON object from input that specifies columns and sort-order of results
     * @param {Array<Section>} results is output of getMatch helper
     * @returns {Array<ResultSection>} as an array of sections conforming to OPTIONS specifications
     */
    private formatMatch(OPTIONS: any, queryType: string, results: Array<any>): Array<ResultSection|ResultRoom> {
        // TODO this big ass method needs refactoring, pronto

        let fResults: Array<ResultSection|ResultRoom> = [];
        let optKeys: Array<string>;
        let colKeys: Array<string>;
        let dataType: string;
        let sortOn: any;

        // extract the keys out of OPTIONS (which should only only contain COLUMNS and ORDER)
        optKeys = Object.keys(OPTIONS);

        // syntax check for COLUMNS
        if (!optKeys.includes('COLUMNS')) {
            throw new Error('SYNTAXERR - no COLUMNS field found')
        }

        // extract the columns for result output
        colKeys = OPTIONS.COLUMNS;
        QueryEngine.checkColumnSyntax(colKeys, results);

        // CREATE RESULTS WITH COLUMN INFORMATION
        fResults = QueryEngine.buildColumns(colKeys, queryType, results);

        // CHECK FOR SORTING SPECIFICATION
        if (optKeys.length === 2 && // this is the only other key
            optKeys.includes('ORDER') // and the second key is ORDER
        ) {
            // there is a specification for sort order...
            sortOn = OPTIONS.ORDER;

            if (typeof(sortOn) === "string") {
                // OPTIONS.ORDER does not contain complex sort information

                // check if sortOn is printed in COLUMNS
                if (!colKeys.includes(sortOn)) {
                    // sorting on a column that is not printed; not allowed
                    throw new Error('SYNTAXERR - cannot order on a column that is not printed')
                }

                fResults =  QueryEngine.handleSimpleSort(sortOn, fResults)

            } else if (Object.keys(sortOn).length === 2) {

                // check if keys in sortOn are printed in COLUMNS
                for (let k of sortOn.keys) {
                    if (!colKeys.includes(k)) {
                        // sorting on a column that is not printed; not allowed
                        throw new Error('SYNTAXERR - cannot order on a column that is not printed')
                    }
                }

                fResults = QueryEngine.handleComplexSort(sortOn, fResults)

            } else {
                throw new Error('SYNTAXERR - OPTIONS is malformed: ' + sortOn)

            }
        } else if (optKeys.length !== 1) {
            // there is a second key that is not ORDER
            throw new Error('SYNTAXERR - one of OPTIONS specifications "' + optKeys + '" are invalid')
        }

        return fResults;
    }


    private static buildColumns(colKeys: Array<string>,
                                dataType: string,
                                results: Array<any>
    ): Array<ResultSection|ResultRoom> {

        let incomingKeys = Object.keys(results[0]);

        for (let colKey of colKeys) {
            if (!incomingKeys.includes(colKey)) {
                throw new Error('SYNTAXERR - cannot print a key in columns that was not used to group entries');
            }
        }

        let cutResults: Array<ResultSection|ResultRoom> = [];

        for (let x of results) {
            if (dataType === 'courses') {
                // building rooms
                let rRoom = new ResultRoom();

                for (let key of colKeys) {
                    // this is terrible, we know
                    rRoom[key] = x[key];

                }
                cutResults.push(rRoom);

            } else if (dataType === 'rooms') {
                // building sections
                let rSec = new ResultSection();

                for (let key of colKeys) {
                    // this is terrible, we know
                    rSec[key] = x[key];

                }
                cutResults.push(rSec);

            }
        }
        return cutResults;

    }

    private static handleSimpleSort(sortOn: any,
                                    unsortedResults: Array<ResultSection|ResultRoom>
    ): Array<ResultSection|ResultRoom> {

        let sortedResults: Array<ResultSection|ResultRoom>;
        let hasStringOrder: boolean = false; // flag for if OPTIONS has alphabetical ORDER
        let hasNumberOrder: boolean = false; // flag for if OPTIONS has numerical ORDER

        // determine what type of field is being sorted on
        if (typeof(unsortedResults[0][sortOn]) === "string") {
            hasStringOrder = true;
        } else if (typeof(unsortedResults[0][sortOn]) === "number") {
            hasNumberOrder = true;
        }

        if (hasStringOrder) {
            // sort on a string
            sortedResults = QueryEngine.sortStringAscending(unsortedResults, sortOn);
        } else if (hasNumberOrder) {
            // sort on a number
            sortedResults = QueryEngine.sortNumericalAscending(unsortedResults, sortOn);
        }

        return sortedResults;
    }

    private static handleComplexSort(sortOn: any,
                                     unsortedResults: Array<ResultSection|ResultRoom>
    ): Array<ResultSection|ResultRoom> {

        let direction: string = sortOn.dir;
        let sortedResults: Array<ResultSection|ResultRoom> = unsortedResults;

        if (direction === 'UP') {
            // sort ASCENDING
            for (let k = (sortOn.keys.length - 1); k >= 0; k--) {
                let currKey = sortOn.keys[k];
                let sortType: string = this.determineSortType(unsortedResults, currKey);

                if (sortType === "string") {
                    // sort string, descending
                    sortedResults = QueryEngine.sortStringAscending(sortedResults, currKey);
                } else if (sortType === "number") {
                    // sort number, descending
                    sortedResults = QueryEngine.sortNumericalAscending(sortedResults, currKey);
                }
            }

        } else if (direction === 'DOWN') {
            // sort DESCENDING
            for (let k = (sortOn.keys.length - 1); k >= 0; k--) {
                let currKey = sortOn.keys[k];
                let sortType: string = this.determineSortType(unsortedResults, currKey);

                if (sortType === "string") {
                    // sort string, descending
                    sortedResults = QueryEngine.sortStringDescending(sortedResults, currKey);
                } else if (sortType === "number") {
                    // sort number, descending
                    sortedResults = QueryEngine.sortNumericalDescending(sortedResults, currKey);
                }
            }

        } else {
            throw new Error('SYNTAXERR - sort direction "' + direction +
                '" is invalid; must either be "UP" or "DOWN"')
        }

        return sortedResults;
    }

    private static determineSortType(unsortedResults: Array<ResultSection | ResultRoom>, currKey: any) {
        let sortType: string;

        if (typeof(unsortedResults[0][currKey]) === "string") {
            sortType = "string";
        } else if (typeof(unsortedResults[0][currKey]) === "number") {
            sortType = "number";
        }

        return sortType;
    }

    private static sortNumericalDescending(fResults: Array<ResultSection|ResultRoom>,
                                           sortOn: string
    ): Array<ResultSection|ResultRoom> {
        return fResults.sort(function (a, b) {
            return Number(b[sortOn]) - Number(a[sortOn]);

        });
    }

    private static sortNumericalAscending(fResults: Array<ResultSection|ResultRoom>,
                                          sortOn: string
    ): Array<ResultSection|ResultRoom> {
        return fResults.sort(function (a, b) {
            return Number(a[sortOn]) - Number(b[sortOn]);

        });
    }

    private static sortStringDescending(fResults: Array<ResultSection|ResultRoom>,
                                        sortOn: string
    ): Array<ResultSection|ResultRoom> {
        return fResults.sort(function (a, b) {
            var nameA = a[sortOn];
            var nameB = b[sortOn];
            if (nameA < nameB) {
                return 1;
            }
            if (nameA > nameB) {
                return -1;
            }

            // names must be equal
            return 0;
        });
    }

    private static sortStringAscending(fResults: Array<ResultSection|ResultRoom>,
                                       sortOn: string
    ): Array<ResultSection|ResultRoom> {
        return fResults.sort(function (a, b) {
            var nameA = a[sortOn];
            var nameB = b[sortOn];
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }

            // names must be equal
            return 0;
        });
    }

    private static checkColumnSyntax(colKeys: Array<string>, results: Array<any>) {
        // check syntax for KEYS in COLUMN

        let transformKeys: Array<string> = Object.keys(results[0]);

        for (let key of colKeys) {
            if (!QueryEngine.isGoodKey(key) && !transformKeys.includes(key)) {
                // is not a transform key; throw error
                throw new Error('SYNTAXERR - key "' + key + '" does not exist')
            }
        }
    }

    /**
     * Encapsulation helper to convert array result into a JSON-formatted body for InsightResponse
     * @param {Array<ResultSection>} fResults are formatted results from formatMatch helper
     * @returns {string} as stringified JSON
     */
    private static encapsulate(fResults: Array<ResultSection|ResultRoom> ): JSON {
        // turn fResults into the JSON return format
        let asJSON = "{\"result\":";
        let withCollection = asJSON.concat(JSON.stringify(fResults));
        let finalBracket = withCollection.concat("}");

        return JSON.parse(finalBracket);
    }

    /**
     * Creates groups based on groupCriteria
     * @param {Array<Section | Room>} ungroupedResults
     * @param {Array<string>} groupCriteria
     * @returns {Array<Array<any>>}
     */
    private static createGroups(ungroupedResults: Array<any>, groupCriteria: Array<string>): Array<Array<any>> {
        let groupDict: any = {};
        let groupedResults: Array<any> = [];

        // check syntax
        if (!isUndefined(ungroupedResults[0].courses_id)) {
            for (let c of groupCriteria) {
                if (!QueryEngine.isSectionKey(c)) {
                    throw new Error('SYNTAXERR - "' + c + '" is not a valid course key')
                }
            }

        } else if (!isUndefined(ungroupedResults[0].rooms_name)) {
            for (let c of groupCriteria) {
                if (!QueryEngine.isRoomKey(c)) {
                    throw new Error('SYNTAXERR - "' + c + '" is not a valid room key')
                }
            }
        }

        // perform grouping
        for (let u of ungroupedResults) {
            // create the group's hash
            let hash: string = "";
            for (let c of groupCriteria) {
                hash = hash + u[c] + "_";
            }

            // check if the hash exists in the dictionary
            if (!isUndefined(groupDict[hash])) {
                // there is a match; add to the group
                groupDict[hash].groupContents.push(u)

            } else {
                // there is no match; add to dictionary
                let newGroup: any = {};
                for (let c of groupCriteria) {
                    newGroup[c] = u[c];
                }
                newGroup.groupContents = [u];

                groupDict[hash] = newGroup;
            }
        }

        for (let k of Object.keys(groupDict)) {
            groupedResults.push(groupDict[k]);
        }

        return groupedResults;
    }

    // checks if a key corresponds with established keys
    static isGoodKey(key: string): boolean {
        let keyIsGood: boolean;

        switch (key) {
            case 'courses_dept':
            case 'courses_id':
            case 'courses_title':
            case 'courses_instructor':
            case 'courses_uuid':
            case 'courses_section':
            case 'courses_avg':
            case 'courses_pass':
            case 'courses_fail':
            case 'courses_audit':
            case 'courses_year':
            case 'rooms_fullname':
            case 'rooms_shortname':
            case 'rooms_number':
            case 'rooms_name':
            case 'rooms_address':
            case 'rooms_type':
            case 'rooms_furniture':
            case 'rooms_href':
            case 'rooms_lat':
            case 'rooms_lon':
            case 'rooms_seats':
                keyIsGood = true;
                break;
            default:
                keyIsGood = false;
        }

        return keyIsGood;
    }

    // checks if a key is for a section
    static isSectionKey(key: string): boolean {
        let keyIsGood: boolean;

        switch (key) {
            case 'courses_dept':
            case 'courses_id':
            case 'courses_title':
            case 'courses_instructor':
            case 'courses_uuid':
            case 'courses_section':
            case 'courses_avg':
            case 'courses_pass':
            case 'courses_fail':
            case 'courses_audit':
            case 'courses_year':
                keyIsGood = true;
                break;
            default:
                keyIsGood = false;
        }

        return keyIsGood;
    }

    // checks if a key is for a room
    static isRoomKey(key: string): boolean {
        let keyIsGood: boolean;

        switch (key) {
            case 'rooms_fullname':
            case 'rooms_shortname':
            case 'rooms_number':
            case 'rooms_name':
            case 'rooms_address':
            case 'rooms_type':
            case 'rooms_furniture':
            case 'rooms_href':
            case 'rooms_lat':
            case 'rooms_lon':
            case 'rooms_seats':
                keyIsGood = true;
                break;
            default:
                keyIsGood = false;
        }

        return keyIsGood;
    }
    // checks if a key encodes a string
    static isStringKey(key: string): boolean {
        let keyIsGood: boolean;

        switch (key) {
            case 'courses_dept':
            case 'courses_id':
            case 'courses_title':
            case 'courses_instructor':
            case 'courses_uuid':
            case 'courses_section':
            case 'rooms_fullname':
            case 'rooms_shortname':
            case 'rooms_number':
            case 'rooms_name':
            case 'rooms_address':
            case 'rooms_type':
            case 'rooms_furniture':
            case 'rooms_href':
                keyIsGood = true;
                break;
            default:
                keyIsGood = false;
        }

        return keyIsGood;
    }

    // checks if a key encodes a number
    static isNumberKey(key: string): boolean {
        let keyIsGood: boolean;

        switch (key) {
            case 'courses_avg':
            case 'courses_pass':
            case 'courses_fail':
            case 'courses_audit':
            case 'courses_year':
            case 'rooms_lat':
            case 'rooms_lon':
            case 'rooms_seats':
                keyIsGood = true;
                break;
            default:
                keyIsGood = false;
        }

        return keyIsGood;
    }

    private static extractDatatype(query: any): string {
        let dataType: string = null;
        let sampleKey: string = query.OPTIONS.COLUMNS[0];

        if (QueryEngine.isSectionKey(sampleKey)) {
            dataType = 'courses';
        } else if (QueryEngine.isRoomKey(sampleKey)) {
            dataType =  'rooms';
        } else {
            // the first key is user-defined
            if (isUndefined(query.TRANSFORMATIONS)) {
                throw new Error('SYNTAXERR - "' + sampleKey +
                    '" is invalid')
            }

            let firstApply: any = query.TRANSFORMATIONS.APPLY[0];
            let userDefinedKey: string = Object.keys(firstApply)[0];
            let applyFn: any = firstApply[userDefinedKey];
            let applyField: string = Object.keys(applyFn)[0];
            let targetField: string = applyFn[applyField];

            if (QueryEngine.isRoomKey(targetField)) {
                dataType = "rooms"
            } else if (QueryEngine.isSectionKey(targetField)) {
                dataType = "courses"
            } else {
                throw new Error('SYNTAXERR - apply function on key "' + dataType +
                '" is invalid')
            }
        }

        return dataType;
    }

}