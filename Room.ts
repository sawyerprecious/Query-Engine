/**
 * This is the object that all rooms will be represented as, similar structure to Section
 */

import {GeoUtil} from "./GeoUtil";

export class Room {
    [index: string]: any;

    rooms_fullname: string;
    rooms_shortname: string;
    rooms_number: string;
    rooms_name: string;
    rooms_address: string;
    rooms_lat: number;
    rooms_lon: number;
    rooms_seats: number;
    rooms_type: string;
    rooms_furniture: string;
    rooms_href: string;

    constructor(
        fullName: string,
        shortName: string,
        number: string,
        address: string,
        seats: number,
        type: string,
        furniture: string,
        href: string
    ) {
        this.rooms_fullname = fullName;
        this.rooms_shortname = shortName;
        this.rooms_number = number;
        this.rooms_name = this.rooms_shortname + "_" + this.rooms_number;
        this.rooms_address = address;
        this.rooms_seats= seats;
        this.rooms_type = type;
        this.rooms_furniture = furniture;
        this.rooms_href = href;
    }

    async generateGeo() {
        // set the Lat-Lon pair for this address
        let that = this;

        await GeoUtil.getLatLon(this.rooms_address)
            .then(function (gr) {
                that.rooms_lat = gr.lat;
                that.rooms_lon = gr.lon;
            })
    }

}