/**
 * Interfaces for all JSON objects used by input zip and database files
 */
import {Section} from "./Section";
import {Room} from "./Room";

export interface CourseJSON {
    result: Array<SectionJSON>
}

export interface DatabaseJSON {
    content: Array<SectionJSON>
}

export interface SectionJSON {
    Audit: number; // courses_audit
    Avg: number; // courses_avg
    Course: string; // courses_id
    Fail: number // courses_fail
    id: number // courses_uuid
    Pass: number // courses_pass
    Professor: string // courses_instructor
    Subject: string; // courses_dept
    Title: string; // courses_title
    Year: number; //courses_year
    Section: string; //courses_section
}

export interface bodyJSON {
    result?: Array<Section|Room>;
    error?: string;
}

export interface QueryJSON {
    WHERE: FilterJSON;
    OPTIONS: OptionsJSON;
    TRANSFORMATIONS?: TransformJSON;
}

export interface FilterJSON{
    OR?: Array<FilterJSON>;
    AND?: Array<FilterJSON>;
    LT?: MCompJSON;
    GT?: MCompJSON;
    EQ?: MCompJSON;
    IS?: SCompJSON;
    NOT?: FilterJSON;
}

export interface OptionsJSON {
    COLUMNS: Array<KeyJSON>
    ORDER?: KeyJSON
}

export interface TransformJSON {
    GROUP: any;
    APPLY: any;
}

export interface SCompJSON {
    [index: string]: string;
    courses_dept?: string;
    courses_id?: string;
    courses_instructor?: string;
    courses_title?: string;
    courses_uuid?: string;
    courses_section?: string;
    rooms_fullname?: string;
    rooms_shortname?: string;
    rooms_number?: string;
    rooms_name?: string;
    rooms_address?: string;
    rooms_type?: string;
    rooms_furniture?: string;
    rooms_href?: string;
}

export interface MCompJSON {
    [index: string]: number;
    courses_avg?: number;
    courses_pass?: number;
    courses_fail?: number;
    courses_audit?: number;
    courses_year?: number;
    rooms_lat?: number;
    rooms_lon?: number;
    rooms_seats?:number;
}

export interface KeyJSON {
    [index: string]: string | number;
    courses_dept?: string;
    courses_id?: string;
    courses_instructor?: string;
    courses_title?: string;
    courses_uuid?: string;
    courses_avg?: number;
    courses_pass?: number;
    courses_fail?: number;
    courses_audit?: number;
    courses_year?: number;
    courses_section?: string;
    rooms_fullname?: string;
    rooms_shortname?: string;
    rooms_number?: string;
    rooms_name?: string;
    rooms_address?: string;
    rooms_type?: string;
    rooms_furniture?: string;
    rooms_href?: string;
    rooms_lat?: number;
    rooms_lon?: number;
    rooms_seats?:number;
}
