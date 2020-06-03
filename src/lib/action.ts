import Package from './package/package.ts';

export default interface Action {
    execute(pkg:Package, parameters:string[]):void;
}
