export type GetterFn<T> = (element: T) => any

export class ArrayUtils {

    static remove<T>(array: T[], itemToRemove: T) {
        return array.filter((item) => {
            return item != itemToRemove;
        })
    }

    static addIfUnique<T>(
        group: T[],
        newItem: T,
        getKeyFn?: (element: T) => any,
    ): T[] {
        if (getKeyFn) {
            const newKey = getKeyFn(newItem)
            const found = group.some(item => getKeyFn(item) === newKey);
            if (!found) {
                group.push(newItem)
            }
        } else {
            if (!group.includes(newItem)) {
                group.push(newItem)
            }
        }

        return group
    }

    static removeRepetitions<T>(
        group: T[],
        getKeyFn?: GetterFn<T>,
    ): T[] {

        let newGroup: T[] = []

        group.forEach(newItem => {
            newGroup = ArrayUtils.addIfUnique(newGroup, newItem, getKeyFn)
        })

        return newGroup
    }

    static async awaitAndMerge<T>(promises: Array<Promise<T[]>>): Promise<T[]> {
        const responses: Array<T[]> = await Promise.all(promises)
        const emptyArray: T[] = [];
        return emptyArray.concat.apply(emptyArray, responses)
    }
}
