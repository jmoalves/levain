export class ArrayUtils { 

    static remove(array:any[], newItem:any) { 
        let newArray = array.filter((item) => { 
            return newItem != item;
        });

        return newArray;
    }
}