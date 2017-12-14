/**
 * This is the singleton database in which all course information will be stored
 */
import {CourseJSON, DatabaseJSON, SectionJSON} from "./IJSON";
let fs = require('fs');
import {Section} from "./Section";
import {isNull, isUndefined} from "util";
import {Room} from "./Room";
import ArrayUtil from "../ArrayUtil";
import {QueryEngine} from "./QueryEngine";

export interface Criteria {
    [index: string]: any;

    // field represents one of the 9 properties of a Section
    property: string,
    // value is value of the field we wish to query
    value: any,
    // equality is one of gt, lt, or eq for numerical fields
    equality?: string
}

export class Database {
    private sectionCollection: Array<Section> = [];
    private roomCollection: Array<Room> = [];
    private performingSectionQuery: Boolean = false;
    private performingRoomQuery: Boolean = false;
    private static instance: Database;

    constructor() {
        if (! Database.instance) {
            this.sectionCollection = [];
            Database.instance = this;
        }
        return Database.instance;

    }

    /**
     * Add takes a JSON object for a course and writes all the sections it encodes into the database
     * @param {string} courseJSON
     */
    addCourse(courseJSON: CourseJSON) {
        for (let i = 0; i < courseJSON.result.length; i++) {
            let sectionJSON: SectionJSON = courseJSON.result[i];
            let s = new Section(
                sectionJSON.Subject,
                sectionJSON.Course,
                sectionJSON.Title,
                sectionJSON.Professor,
                sectionJSON.Avg,
                sectionJSON.Pass,
                sectionJSON.Fail,
                sectionJSON.Audit,
                sectionJSON.id,
                sectionJSON.Year,
                sectionJSON.Section
            );

            this.sectionCollection.push(s);

        }
    }

    addSection(section: any) {
        this.sectionCollection.push(section);
    }

    addRoom(room: any) {
        this.roomCollection.push(room);
    }

    /**
     * Get an array of promises that resolve every room's address into a lat-lon pair
     * @returns {Promise<any>}
     */
    loadAllRoomGeo(): Array<Promise<null>> {
        let promises: Array<Promise<null>> = [];

        for (let room of this.roomCollection) {
            promises.push(room.generateGeo())
        }

        return promises;

    }

    saveZipToDatabase(id: string, dbList: Array<string>): number {
        let db = new Database;

        // completely processed zip; save database and fulfill promise
        if (dbList.includes(id)) {
            // this database has been loaded before
            this.saveDB(id, false);
            return 201;

        } else {
            // is a new database id
            db.saveDB(id, true);
            return 204;

        }
    }

    /**
     * Delete a section from the database
     */
    deleteEntry(s: Section) {
        let target:number = this.sectionCollection.indexOf(s);
        if (target > -1) {
            this.sectionCollection.splice(target, 1);
        }
    }

    /**
     * Saves the current state of the database to a single file formatted in JSON
     * @param {string} dbName is the file name on disk
     * @param firstTime is true if this is the first time this database is being saved
     *  (usually only after populating from zip)
     */
    saveDB(dbName: string, firstTime?: boolean){
        // write in as json
        let cacheContents = this.pukeMemory(dbName);
        // console.log(finalBracket);

        fs.writeFileSync("./dbFiles/" + dbName, cacheContents);

    }

    /**
     * Loads a database from file by name
     * @param {string} dbName is the name of the database to be loaded into memory
     */
    loadDB(dbName: string) {
        try {
            var content = fs.readFileSync('./dbFiles/' + dbName).toString('utf8');
            var dbJSON: DatabaseJSON = JSON.parse(content);

            let that = this;

            switch (dbName) {
                case "courses":
                    dbJSON.content.forEach(function (s) {
                        that.addSection(s);
                    });
                    break;

                case "rooms":
                    dbJSON.content.forEach(function (r) {
                        that.addRoom(r)
                    });
                    break;
            }

        } catch (err) {
            if (err.message.includes('ENOENT')) {
                throw new Error('DATASETERR - database "' + dbName + '" has not been loaded/cached')
            } else {
                throw err;
            }
        }
    }

    /**
     * Deletes a database from disk and clears its entries from memory
     * @param {string} dbName
     */
    deleteDB(dbName: string) {

        if (this.listLoaded().includes(dbName)) {
            // blank memory and reload remaining databases
            this.reset(dbName);

            // delete from disk
            fs.unlinkSync('./dbFiles/' + dbName)

        }

    }

    /**
     * Sets query flag to be looking for Sections
     */
    setSectionQuery() {
        if (this.performingRoomQuery) {
            throw new Error("query asks for both room and section information")

        } else {
            this.performingSectionQuery = true;

        }
    }

    /**
     * Sets query flag to be looking for Rooms
     */
    setRoomQuery() {
        if (this.performingSectionQuery) {
            throw new Error("query asks for both room and section information")

        } else {
            this.performingRoomQuery = true;

        }
    }

    /**
     * Resets both query flags
     */
    resetQuery() {
        this.performingSectionQuery = false;
        this.performingRoomQuery = false;

    }

    /**
     * Queries takes an array of Criteria and queries the database to return an array of sections that fulfill
     *  all the criteria
     * @param {Array<Criteria>} questions
     * @returns {Array<Section>}
     */
    // queries(questions: Array<Criteria>): Array<Section|Room> {
    //     let result: Array<Section|Room>;
    //     let originalDB: Array<Section>;
    //
    //     for (let q of questions) {
    //         // check if first query
    //         if (questions[0] === q) {
    //             // hold onto the current database
    //             originalDB = this.sectionCollection.slice(0);
    //
    //         }
    //
    //         if (
    //             q.property === "courses_dept" ||
    //             q.property === "courses_id" ||
    //             q.property === "courses_title" ||
    //             q.property === "courses_instructor" ||
    //             q.property === "courses_uuid"
    //         ) {
    //             // is a string query
    //             result = this.handleStrQuery(q.property, q.value)
    //
    //         } else if (
    //             q.property === "courses_avg" ||
    //             q.property === "courses_pass" ||
    //             q.property === "courses_fail" ||
    //             q.property === "courses_audit"
    //         ) {
    //             // is a numerical query with some equality comparison
    //             result = this.handleNumQuery(q.property, q.value, q.equality)
    //
    //         } else {
    //             // query is poorly formed; throw error
    //             throw new Error('query is poorly formed; property "' + q.property + '" does not exist')
    //
    //         }
    //         // set result of this sub-query as the new database for the next query
    //         this.reset();
    //
    //         // if nothing was returned, no sections match the search criteria; break out
    //         if (result.length === 0) {
    //             break;
    //         }
    //
    //         // write in results as working database for next sub-query
    //         for (let s of result) {
    //             this.sectionCollection.push(s);
    //         }
    //
    //     }
    //     // done all queries; restore original database
    //     this.reset();
    //     for (let s of originalDB) {
    //         this.sectionCollection.push(s);
    //     }
    //
    //     // return query results
    //     return result;
    //
    // }

    /**
     * Query takes a Criteria object and queries the database to return an array of sections that fulfill
     *  the criteria
     * @param {Array<Criteria>} question
     * @returns {Array<Section>}
     */
    query(question: Criteria): Array<Section|Room> {
        let result: Array<Section|Room>;

    if (isNull(question)) {
            result = ArrayUtil.union([this.sectionCollection, this.roomCollection]);

    } else if (QueryEngine.isStringKey(question.property)) {
        // is a string query
        result = this.handleStrQuery(question.property, question.value)

    } else if (QueryEngine.isNumberKey(question.property)) {
        // is a numerical query with some equality comparison
        result = this.handleNumQuery(question.property, question.value, question.equality)

    }  else {
        // query is poorly formed; throw error
        throw new Error('query is poorly formed; property "' + question.property + '" does not exist')

    }

    // return query results
    return result;

    }

    // helper to courses_pass into the correct case of the 5 possible string-match queries
    private handleStrQuery(property: string, value: any): Array<Section|Room> {
        switch (property) {
            case 'courses_dept': return this.getDept(value);
            case 'courses_id': return this.getID(value);
            case 'courses_title': return this.getTitle(value);
            case 'courses_instructor': return this.getInstructor(value);
            case 'courses_uuid': return this.getUUID(value);
            case 'courses_section': return this.getSection(value);
            case 'rooms_fullname': return this.getFullName(value);
            case 'rooms_shortname': return this.getShortName(value);
            case 'rooms_number': return this.getNumber(value);
            case 'rooms_name': return this.getName(value);
            case 'rooms_address': return this.getAddress(value);
            case 'rooms_type': return this.getType(value);
            case 'rooms_furniture': return this.getFurniture(value);
            case 'rooms_href': return this.getHref(value);
        }
    }

    // helper to courses_pass into the correct case of the 4 possible numerical queries
    private handleNumQuery(property: string, value: any, equality: string): Array<Section|Room> {
        switch (property) {
            case 'courses_avg': return this.getAvg(value, equality);
            case 'courses_pass': return this.getPass(value, equality);
            case 'courses_fail': return this.getFail(value, equality);
            case 'courses_audit': return this.getAudit(value, equality);
            case 'courses_year': return this.getYear(value, equality);
            case 'rooms_lat': return this.getLat(value, equality);
            case 'rooms_lon': return this.getLon(value, equality);
            case 'rooms_seats': return this.getSeats(value, equality);
        }
    }

    /**
     * BEGIN: The 9 basic query methods are below
     */

    getDept(dept: string): Array<Section> {
        return this.meetRegexCriteria('courses_dept', dept)
    }

    getID(id: string): Array<Section> {
        return this.meetRegexCriteria('courses_id', id)
    }

    getTitle(title: string): Array<Section> {
        return this.meetRegexCriteria('courses_title', title)
    }

    getInstructor(instructor: string): Array<Section> {
        return this.meetRegexCriteria('courses_instructor', instructor)
    }

    getAvg(avg: number, equality: string): Array<Section> {
        return this.meetEqualityCriteria('courses_avg', avg, equality);
    }

    getPass(pass: number, equality: string): Array<Section> {
        return this.meetEqualityCriteria('courses_pass', pass, equality);
    }

    getFail(fail: number, equality: string): Array<Section> {
        return this.meetEqualityCriteria('courses_fail', fail, equality);
    }

    getAudit(audit: number, equality: string): Array<Section> {
        return this.meetEqualityCriteria('courses_audit', audit, equality);
    }

    getUUID(uuid: string): Array<Section> {
        // expects ONE result b/c UUID is unique by definition
        return this.meetRegexCriteria('courses_uuid', uuid)
    }

    getYear(year: number, equality: string): Array<Section> {
        return this.meetEqualityCriteria('courses_year', year, equality);
    }

    getSection(section: string): Array<Section> {
        return this.meetRegexCriteria('courses_section', section)
    }

    //Rooms

    getFullName(fullname: string): Array<Room> {
        return this.meetRegexCriteria('rooms_fullname', fullname)
    }

    getShortName(shortname: string): Array<Room> {
        return this.meetRegexCriteria('rooms_shortname', shortname)
    }

    getNumber(number: string): Array<Section|Room> {
        return this.meetRegexCriteria('rooms_number', number)
    }

    getName(name: string): Array<Section|Room> {
        return this.meetRegexCriteria('rooms_name', name)
    }

    getAddress(address: string): Array<Room> {
        return this.meetRegexCriteria('rooms_address', address)
    }

    getType(type: string): Array<Room> {
        return this.meetRegexCriteria('rooms_type', type)
    }

    getFurniture(furniture: string): Array<Room> {
        return this.meetRegexCriteria('rooms_furniture', furniture)
    }

    getHref(href: string): Array<Room> {
        return this.meetRegexCriteria('rooms_href', href)
    }

    getLat(lat: number, equality: string): Array<Room> {
        return this.meetEqualityCriteria('rooms_lat', lat, equality)
    }

    getLon(lon: number, equality: string): Array<Room> {
        return this.meetEqualityCriteria('rooms_lon', lon, equality)
    }

    getSeats(seats: number, equality: string): Array<Room> {
        return this.meetEqualityCriteria('rooms_seats', seats, equality)
    }

    /**
     * Abstracted helper function to process regular expression queries of relevant string fields
     * @param {string} property is the Section property that is being queried
     * @param regex is the regular expression query
     * @returns {Section[]} an array of sections with fields matching regex
     */
    private meetRegexCriteria(property: string, regex: string) {
        let filtered: Array<any> = [];
        let re: RegExp = RegExp(regex);

        switch(property){
            case 'courses_dept':
            case 'courses_id':
            case 'courses_title':
            case 'courses_instructor':
            case 'courses_uuid':
            case 'courses_section':
                // query is for a section
                filtered = this.sectionCollection.filter(function (section: Section) {
                    return re.test(section[property]);
                });
                break;

            case 'rooms_fullname':
            case 'rooms_shortname':
            case 'rooms_number':
            case 'rooms_name':
            case 'rooms_address':
            case 'rooms_type':
            case 'rooms_furniture':
            case 'rooms_href':
                // query is for a room
                filtered = this.roomCollection.filter(function (room: Room) {
                    return re.test(room[property]);
                });
                break;
        }

        return filtered;
    }

    /**
     * Abstracted helper function to process inequality queries of relevant numerical fields
     * @param {string} property is the Section property that is being queried
     * @param {number} threshold is the value that the inequality will be checked against
     * @param {string} equality is one of eq = equals, lt = less than, or gt = greater than
     * @returns {Section[]} an array of sections
     */
    private meetEqualityCriteria(property: string, threshold: number, equality: string): Array<any> {

        switch (property) {
            case 'courses_avg':
            case 'courses_pass':
            case 'courses_fail':
            case 'courses_audit':
            case 'courses_year':
                // query is for a course
                if (equality === "GT") {
                    return this.sectionCollection.filter(function (section: Section) {
                        return section[property] > threshold && !isNull(section[property]);
                    })
                } else if (equality === "LT") {
                    return this.sectionCollection.filter(function (section: Section) {
                        return section[property] < threshold && !isNull(section[property]);
                    })
                } else if (equality === "EQ") {
                    return this.sectionCollection.filter(function (section: Section) {
                        return section[property] === threshold && !isNull(section[property]);
                    })
                } else {
                    // equality did not match gt, lt, or eq; throw error
                    throw new Error('equality query expected "GT", "LT", or "EQ"')
                }

            case 'rooms_lat':
            case 'rooms_lon':
            case 'rooms_seats':
                // query is for a room
                if (equality === "GT") {
                    let y = this.roomCollection.filter(function (room: Room) {
                        let x = room[property] > threshold && !isNull(room[property]);
                        return x;
                    })

                    return y;
                } else if (equality === "LT") {
                    return this.roomCollection.filter(function (room: Room) {
                        return room[property] < threshold && !isNull(room[property]);
                    })
                } else if (equality === "EQ") {
                    return this.roomCollection.filter(function (room: Room) {
                        return room[property] === threshold && !isNull(room[property]);
                    })
                } else {
                    // equality did not match gt, lt, or eq; throw error
                    throw new Error('equality query expected "GT", "LT", or "EQ"')
                }

        }


    }

    /**
     * Converts entire array collection into JSON format and returns as string
     *   Should really be diagnostic use only...
     * @param {string} id is the database to be regurgitated
     * @returns {string} as string-encoded JSON representing database contents for given ID
     */
    pukeMemory(id: string): string {
        let asJSON = "{\"content\": ";

        // choose database to fetch
        let withCollection: string;
        switch (id) {
            case 'courses':
                withCollection = asJSON.concat(JSON.stringify(this.sectionCollection));
                break;
            case 'rooms':
                withCollection = asJSON.concat(JSON.stringify(this.roomCollection));
                break;
        }

        let finalBracket = withCollection.concat("}");

        return finalBracket;
    }

    getOpposite(a: Array<any>): Array<Section|Room> {
        let inputContents = new Set(a);

        if (a.length > 0) {
            if (!isUndefined(a[0].rooms_seats)) {
                let diff = Array.from(
                    new Set(
                        this.roomCollection.filter(x => !inputContents.has(x))
                    )
                );

                return diff;

            } else if (!isUndefined(a[0].courses_id)){
                let diff = Array.from(
                    new Set(
                        this.sectionCollection.filter(x => !inputContents.has(x))
                    )
                );

                return diff;

            }

        } else {
            // getting opposite of an empty array; return all of that type
            if (this.performingSectionQuery) {
                return this.sectionCollection;

            } else if (this.performingRoomQuery) {
                return this.roomCollection;

            }
        }
    }

    // returns number of entries loaded in current database
    countEntries(): number {
        let totalEntries: number = (this.sectionCollection.length + this.roomCollection.length);
        return totalEntries
    }

    // returns the database that is currently loaded
    listLoaded(): Array<string> {
        return fs.readdirSync('./dbFiles/');
    }

    // returns a list of the databases stored in memory
    listDB(): Array<string> {
        return fs.readdirSync('./dbFiles');
    }

    hasDB(id: string): boolean {
        return this.listLoaded().includes(id);
    }

    // may be used to blank the entire database before loading a query DB or restoring the main DB
    reset(db: string) {
        switch (db) {
            case "all":
                this.sectionCollection.length = 0;
                this.roomCollection.length = 0;
                break;
            case "courses":
                this.sectionCollection.length = 0;
                break;
            case "rooms":
                this.roomCollection.length = 0;
                break;
        }
    }
}

const instance = new Database;
// Object.freeze(instance);

export default instance;