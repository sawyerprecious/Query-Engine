/**
 * Array utility methods to work with arrays.
 *
 * @param msg
 */

export default class ArrayUtil {

    /**
     * Computes the union of two input arrays
     * @param {Array<Array<any>>} arrays is an array of the arrays that will be union-ed
     * @returns {Array<any>} an array that is the union of the inputs
     */
    public static union(arrays: Array<Array<any>>): Array<any> {
        let result = [];
        let joinedArray: Array<any> = [];

        for (let a of arrays) {
            joinedArray = joinedArray.concat(a);
        }

        result = Array.from(new Set(joinedArray));

        return result;
    }

    /**
     * Computes the intersection of two input arrays
     * @param {Array<Array<any>>} arrays is an array of the arrays that will be intersect-ed
     * @returns {Array<any>} an array that is the intersection of the inputs
     */
    public static intersection(arrays: Array<Array<any>>): Array<any> {
        let result: Array<any> = [];

        // determine the shortest array
        let indexOfShortest: number = 0;
        let length: number = arrays[0].length;

        for (let i = 1; i < arrays.length; i++) {
            if (arrays[i].length < length) {
                indexOfShortest = i;
                length = arrays[i].length

            }
        }

        // store the shortest array as running result and remove it from the input
        result = arrays[indexOfShortest].slice(0);
        arrays.splice(indexOfShortest, 1);

        for (let a of arrays) {
            let tempSet = new Set(a);
            result = result.filter(e => tempSet.has(e));
        }

        return result;
    }

}
