export class Building {
    [index: string]: any;

    bldg_fullname: string;
    bldg_shortname: string;
    bldg_address: string;

    constructor (
        fullname: string,
        shortname: string,
        address: string
    ) {
        this.bldg_fullname = fullname;
        this.bldg_shortname = shortname;
        this.bldg_address = address;
    }

}