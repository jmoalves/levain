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

    static makeUnique<T>(group: T[]): T[] {
        return group
    }

}
