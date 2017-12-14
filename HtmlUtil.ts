import {Building} from "./Building";
import {Room} from "./Room";
import {Database} from "./Database";

export class HtmlUtil {
    static readBuildingIndex(index: JSON): Array<Building> {
        // store each building as Building object
        let buildings: Array<Building> = [];

        // get the tbody table out of the JSONified HTML
        let tbody: any = HtmlUtil.getTBody(index);

        // iterate on the buildings; create and store Building object for each
        for (let buildingNode of tbody.childNodes) {
            if (buildingNode.nodeName === "tr") {
                buildings.push(HtmlUtil.createBuildingFromNode(buildingNode))
            }
        }

        return buildings;

    }

    private static createBuildingFromNode(node: any): Building {
        let longname: string = '';
        let shortname: string = '';
        let address: string = '';

        // find the three properties in this shit-storm of automagically generated html/json nodes
        for (let node1 of node.childNodes) {
            if (node1.attrs) { // property attrs exists
                for (let node2 of node1.attrs) {
                    if (node2.value === 'views-field views-field-field-building-code') { // found shortname
                        shortname = node1.childNodes[0].value.trim()

                    } else if (node2.value === 'views-field views-field-field-building-address') { // found shortname
                        address = node1.childNodes[0].value.trim()

                    } else if (node2.value === 'views-field views-field-title') { // found shortname
                        longname = node1.childNodes[1].childNodes[0].value

                    }

                    if (longname && shortname && address) {
                        break; // everything has been found; exit
                    }
                }
            }
        }

        // build the Building
        let b: Building = new Building(longname, shortname, address);

        return b;
    }

    /**
     * Create room objects in a given Building from information in the JSON
     * @param {Building} building is the building whose rooms are being generated
     * @param buildingJson is the JSON object representing the building from parse5
     * @returns {Array<Room>} an array of rooms that can be found in Buliding
     */
    static readRoomsInBuilding(building: Building, buildingJson: any) {

        // get the tbody table out of the JSONified HTML
        let tbody: any = HtmlUtil.getTBody(buildingJson);

        // check if there are any results for rooms in this building
        if (!tbody) {
            // this building has no rooms
            throw new Error('building ' + building.bldg_shortname + ' has no rooms')
        }

        // iterate on the rooms; create and store Room objects for each
        for (let roomNode of tbody.childNodes) {
            if (roomNode.nodeName === "tr") {
                HtmlUtil.createRoomFromNode(building, roomNode)
            }
        }

    }

    private static createRoomFromNode(building: Building, roomNode: any) {
        let number: string = '';
        let seats: number = null;
        let type: string = '';
        let furniture: string = '';
        let href: string = '';

        // find the five properties in this puke-cano of automagically generated html/json nodes
        for (let node1 of roomNode.childNodes) {
            if (node1.attrs) { // property attrs exists
                for (let node2 of node1.attrs) {
                    if (node2.value === 'views-field views-field-field-room-number') { // found room number
                        number = node1.childNodes[1].childNodes[0].value.trim()

                    } else if (node2.value === 'views-field views-field-field-room-capacity') { // found # of seats
                        seats = parseInt(node1.childNodes[0].value.trim())

                    } else if (node2.value === 'views-field views-field-field-room-type') { // found room type
                        type = node1.childNodes[0].value.trim()

                    } else if (node2.value === 'views-field views-field-field-room-furniture') { // found furniture
                        furniture = node1.childNodes[0].value.trim()

                    } else if (node2.value === 'views-field views-field-nothing') { // found href URL
                        href = node1.childNodes[1].attrs[0].value

                    }

                    if (number && seats && type && furniture && href) {
                        break; // everything has been found; exit
                    }
                }
            }
        }

        // build the Room
        let r: Room = new Room(
            building.bldg_fullname,
            building.bldg_shortname,
            number,
            building.bldg_address,
            seats,
            type,
            furniture,
            href
        );

        let db = new Database();
        db.addRoom(r);
    }

    // get the tbody node containing the room information
    static getTBody(json: JSON) {
        return this.getNodeByNodeName('tbody', json)
    }

    // recursively search the JSON for a nodeName property
    private static getNodeByNodeName (nodeName: string, node: any) { // node is JSON
        let reduce = [].reduce;

        function runner (result: any, node: any): any { // result, node are JSON
            if (result || !node) {
                return result;
            }

            return node.nodeName === nodeName && node || // target found?
                runner(null, node.childNodes) || // if not, search the children
                reduce.call(Object(node), runner, result) // iterate through each node's contents
        }

        let resultNode: any =  runner(null, node);
        return resultNode
    }
}