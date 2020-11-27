import Package from "./package.ts";

export class MockPackage implements Package {

    constructor(
        public name: string = 'mockPackage',
        public version: string = '1.0.0',
        public filePath: string = `/mock/${name}-${version}.yml`,
    ) {
    }

}