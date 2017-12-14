/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse} from "./IInsightFacade";

import Log from "../Util";
import {Database} from "./Database";
import InputHandler from "./InputHandler";
import {QueryEngine} from "./QueryEngine";
let JSZip = require('jszip');
let fs = require('fs');

export default class InsightFacade implements IInsightFacade {

    constructor() {
        // Log.trace('InsightFacadeImpl::init()');

        // check if dbFiles directory exists; if not create
        try {
            fs.mkdirSync('./dbFiles');

        } catch (err) {
            if ( err.code !== 'EEXIST') {
                // some error other than "file exists" was thrown;
                throw err;
            }

        }
    }

    addDataset(id: string, content: string): Promise<InsightResponse> {

        return new Promise(function (fulfill, reject) {

            let zip = new JSZip();

            // get current list of databases BEFORE adding new
            let db = new Database();
            let dbList: Array<string> = db.listDB();

            // load serialized zip into JSZip object
            zip.loadAsync(content, {base64: true})
                .then(function (zipContents: JSZip) {

                    if (dbList.includes(id)) {
                        db.reset(id);
                    }

                    // process the zip based on id
                    switch (id) {
                        case "courses":
                            return InputHandler.prototype.handleCourseZip(zipContents);

                        case "rooms":
                            return InputHandler.prototype.handleRoomZip(zipContents);

                        default:
                            // id is not one of courses or room;
                            reject({
                                code: 400,
                                body: {error: 'input id is neither "courses" nor "rooms"'}
                            })

                    }

                })

                .catch(function (err: Error) {
                    // if error on decoding base64 representation of zip
                    Log.error('Zip err - ' + err.message);
                    reject({
                        code: 400,
                        body: {error: err.message}
                    })
                })

                .then(function () {
                    // save id to Database and fulfill
                    let returnCode: number = db.saveZipToDatabase(id, dbList);

                    switch(returnCode) {
                        case 201:
                            fulfill({
                                code: 201,
                                body: {message: 'dataset successfully added; id already exists'}
                            });
                            break;

                        case 204:
                            fulfill({
                                code: 204,
                                body: {message: 'dataset successfully added'}
                            });
                            break;

                        default:
                            break;
                    }

                })

                .catch(function (err: InsightResponse) {
                    // there was an error processing zip contents
                    Log.error('zip content error');
                    reject(err);
                })
        })
    }

    removeDataset(id: string): Promise<InsightResponse> {
        // check if database contains this id
        let db = new Database();

        return new Promise(function (fulfill, reject) {
            if (!db.hasDB(id)) {
                // this database was not previously cached or loaded
                reject({
                    code: 404,
                    body: {error: 'resource does not exist; database "' + id + '" was never cached'}
                })
            } else {
                db.deleteDB(id);
                fulfill({
                    code: 204,
                    body: {message: 'database ' + id + ' deleted'}
                })
            }
        })
    }

    performQuery(query: any): Promise<InsightResponse> {
        return new Promise(function (fulfill, reject) {
            try {
                // execute the query and get back stringified array of matching Sections
                let p: JSON = QueryEngine.prototype.parse(query);

                fulfill({
                    code: 200,
                    body: p
                })

            } catch (err) {
                // something went wrong in building or evaluating AST

                if (err.message.includes('SYNTAXERR')) {
                    reject({
                        code: 400,
                        body: {error: err.message}
                    })

                } else if (err.message.includes('DATASETERR')) {
                    reject({
                        code: 424,
                        body: {error: err.message}
                    })

                } else {
                    reject({
                        code: 400,
                        body: {error: 'something is wrong... - ' + err.message}
                    })
                }

            }
        })
    }


}
