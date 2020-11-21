import {Package} from "./package.ts";

export class MockPackage implements Package {

    constructor(
        public name: string,
        public version: string = '1.0.0',
    ) {
    }
    
}