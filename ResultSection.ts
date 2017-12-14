/**
 * This is the course section object that all sections will be represented as
 */

export class ResultSection{
    [index: string]: string | number;

    courses_dept?: string;
    courses_id?: string;
    courses_title?: string;
    courses_instructor?: string;
    courses_avg?: number;
    courses_pass?: number;
    courses_fail?: number;
    courses_audit?: number;
    courses_uuid?: number;
    courses_year?: number;
    courses_section?: string;
}
