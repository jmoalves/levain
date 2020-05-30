import Package from './package.ts';

export default interface Action {
    execute(pkg:Package, parameters:string[]):void;
}
