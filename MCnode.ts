import {ANode} from "./ANode";
import {MCompJSON} from "../IJSON";
import {Section} from "../Section";
import {error, isNumber} from "util";
import {Database} from "../Database";
import {Room} from "../Room";

export class MCnode extends ANode {

    m_key: string;
    num: number;
    equality: string;

    constructor(mc: MCompJSON, lgc: string) {
        super();
        let db = new Database();

        // get the type of inequality out
        this.equality = lgc;

        // get the m_key out of the object
        this.m_key = Object.keys(mc)[0];

        if (this.m_key.match(
                /^(courses_avg|courses_pass|courses_fail|courses_audit|courses_year)/
            )) {

            if (!db.listLoaded().includes('courses')) {
                throw new Error('DATASETERR: courses dataset not loaded')
            }

            db.setSectionQuery();

        } else if (this.m_key.match(
                /^(rooms_lat|rooms_lon|rooms_seats)/
            )) {

            if (!db.listLoaded().includes('rooms')) {
                throw new Error('DATASETERR: rooms dataset not loaded')
            }

            db.setRoomQuery();

        } else {
            throw new Error('SYNTAXERR - some m_key is poorly formed')

        }

        this.num = mc[this.m_key];

        if (!isNumber(this.num)) {
            throw new Error('SYNTAXERR - m_keys must be filtered on numbers')
        }
    }

    evaluate(): Array<Section|Room> {
        let db = new Database();

        let accumulatingResult: Array<any> = db.query({
            property: this.m_key,
            value: this.num,
            equality: this.equality
        });
        return accumulatingResult;
    }

}