/**
 * This contains handler functions for asynchronous addition of a file to the database
 */

import Log from "../Util";
import {Database} from "./Database";
import {CourseJSON} from "./IJSON";
import {InsightResponse} from "./IInsightFacade";
import {HtmlUtil} from "./HtmlUtil";
import {Building} from "./Building";
import {error, isNull} from "util";
let parse5 = require('parse5');

export default class InputHandler {

    containsValidJSON: boolean;

    /**
     * Helper iterates over Courses .zip file contents to add each containing file to Database
     * @param {JSZip} zipContents is .zip file represented as JSZip object
     * @returns {Promise<InsightResponse>} when all files are handled
     */
    async handleCourseZip(zipContents: JSZip) {

        // store all the promises in this array
        let coursePromiseCollection: Array<Promise<InsightResponse>> = [];
        let counter: number = 1;

        let that = this;

        // track existence of AT LEAST ONE valid JSON; assume false
        this.containsValidJSON = false;

        try {
            await zipContents.file('index.htm').async("text")
                .then(function (html: string) {
                    return parse5.parse(html)
                });

            // WILL ONLY REACH HERE IF ZIP ACTUALLY CONTAINS HTML
            throw new Error('BADID - rooms zip loaded as id "courses"')

        } catch(err) {
            if (err.message.includes("BADID")) {
                // failed because rooms loaded as courses
                throw err;
            }
        }

        zipContents.forEach(function (relativePath, file) {
            if (!file.dir) { // process only files, NOT directories

                let p: Promise<InsightResponse> = that.buildFilePromise(file, counter);

                // add promise to iterable
                coursePromiseCollection.push(p);
                counter++;
            }
        });

        if (coursePromiseCollection.length === 0) {
            // there were no files processed
            throw new Error('zip is empty');
        }

        // wait for all promises for file processing to settle
        await this.ProcessAllFiles(coursePromiseCollection, counter);
    }

    /**
     * Helper to build individual promises that each process one file
     * @param {JSZipObject} file is the file that will be processed
     * @param {number} counter is the unique number of this file in the zip
     * @returns {Promise<any>} of file being added to the database
     */
    buildFilePromise(file: JSZipObject, counter: number): Promise<any> {
        let that = this;

        return new Promise(function (fulfill, reject) {
            that.handleCourseFile(file, counter)
                .then(function () {
                    if (!that.containsValidJSON) {
                        that.containsValidJSON = true;
                    }
                    fulfill();

                })

                .catch(function (err) {
                    // SyntaxError OR JSON is valid but empty
                    // Log.error('file failed to be processed - ' + err.body.error);
                    if (typeof err === "Error" && err.message.includes("IDERR")) {
                        reject(err);
                    } else {
                        fulfill();
                    }

                });
        });
    }

    /**
     * Helper handles addition of individual Course files within zip to Database
     * @param {JSZipObject} file is the file to be processed
     * @param {number} counter uniquely identifies sequence of this file within zip
     * @returns {Promise<any>} queuing entry of this file into Database
     */
    private handleCourseFile(file: JSZipObject, counter: number): Promise<InsightResponse> {
        return new Promise<InsightResponse>(function (fulfill, reject) {

            let db = new Database();
            let parsedJSON: CourseJSON;

            file.async('string').then(function (fileContents: string) {
                // successfully got file as string
                try {
                    parsedJSON = JSON.parse(fileContents);

                    if (parsedJSON.result.length === 0) {
                        // there is no real data
                        reject({
                            code: 400,
                            body: {error: 'contains no section data'}
                        })

                    } else {
                        db.addCourse(parsedJSON);
                        fulfill({
                            code: 204,
                            body: {message: 'successfully added file ' + counter}
                        });

                    }

                } catch (err) {
                    // check if HTML is being parsed as JSON
                    if (fileContents.includes("result")) {
                        Log.error('JSON in file ' + counter + ' is invalid - ' + err.toString());
                        reject({
                            code: 400,
                            body: {error: 'JSON in file ' + counter + ' is invalid - ' + err.toString()}
                        });

                    } else {
                        reject(new Error('IDERR: HTML being parsed as JSON; should dataset ID be "rooms"?'))

                    }

                }

                // successfully added a complete course to database
                // UNCOMMENT BELOW for very verbose logging of each file
                // if (parsedJSON.result.length > 0) {
                //     Log.info('file ' + counter +
                //         ' successfully added ' +
                //         parsedJSON.result[0].Subject + " " +
                //         parsedJSON.result[0].Course
                //     );
                //
                // } else {
                //     Log.info('file ' + counter +
                //         ' is a course without no recorded sections'
                //     )
                // }

            }).catch(function (err: Error) {


                // file.async could not read file
                Log.error('async error reading file: ' + err);
                reject({
                    code: 400,
                    body: {error: 'file.async failing to read file ' + counter}
                })

            })
        });
    }

    async handleRoomZip(zipContents: JSZip) {
        // TODO: REFACTOR ME, I'M FRANKENSTEIN'S MONSTER D:
        this.containsValidJSON = false; // RESET the flag

        let counter: number = 1;

        let first: Boolean = true;

        zipContents.forEach(function (path, file) {

            if (first && !isNull(file) && !file.dir) { // process only files, NOT directories
                first = false;

                file.async('string').then(function (content) {
                    try {
                        JSON.parse(content);

                        // should not reach here; zip contents is JSON
                        throw new Error('BADID - courses zip loaded as id "rooms"')

                    } catch (err) {
                        if (err.message.includes("BADID")) {
                            // failed because rooms loaded as courses
                            throw err;
                        }
                    }
                });

            }
        });

        let index: JSON = await zipContents.file('index.htm').async("text")
            .then(function (html: string) {
                return parse5.parse(html)
            });

        // get list of buildings
        let buildingList: Array<Building> = HtmlUtil.readBuildingIndex(index);

        for (let building of buildingList) {
            // count number of rooms
            counter++;

            // extract building short-name code
            let buildingCode = building.bldg_shortname;

            // get this building's HTML and convert to JSON
            let buildingJson: JSON =
                await zipContents.file('campus/discover/buildings-and-classrooms/' +
                    buildingCode).async("text")
                    .then(function (html: string) {
                        return parse5.parse(html)
                    });

            // process rooms in a given building and add to DB
            try {
                HtmlUtil.readRoomsInBuilding(building, buildingJson);

                // only reachable if readRooms returns w/o error
                this.containsValidJSON = true;

            } catch (err) {
                // catch error and log; should just be room w/o building...
                // Log.info(err.message)

            }

        }

        // complete processing of all rooms by populating their geo-location information;
        //  then save the db to file
        let db = new Database();
        let geoPromises = db.loadAllRoomGeo();

        await this.ProcessAllFiles(geoPromises, counter)

    }

    /**
     * Helper that returns a promise awaiting the resolution of an array of
     *  promises to add individual courses to DB
     * @param {Array<Promise<InsightResponse>>} coursePromiseCollection is the array of promises to-complete
     * @param {number} counter is the number of files in the array
     * @returns {Promise<any>}
     * @constructor
     */
    private ProcessAllFiles(promiseCollection: Array<Promise<InsightResponse>>,
                            counter: number): Promise<any> {
        let that = this;

        return Promise.all(promiseCollection)
            .then(function () {
                InputHandler.LogDatabaseStateToConsole(counter);

                if (!that.containsValidJSON) {
                    // there were no valid JSON files in the zip
                    return Promise.reject({
                        code: 400,
                        body: {error: 'zip contained no valid JSON files'}
                    })
                }
            })

            .catch(function (err: InsightResponse) {
                // something went wrong...
                Log.info('failed to process all files in .zip');

                return Promise.reject(err);
            })
    }

    private static LogDatabaseStateToConsole(counter: number) {
        let db = new Database();

        // complete contents of zip added to database
        Log.info('=== DATABASE LOADED ===');
        Log.info('processed ' + (counter - 1) + ' files');
        Log.info('database contains ' + db.countEntries().toString() + ' entries');
    }

}