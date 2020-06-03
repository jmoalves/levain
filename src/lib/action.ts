import Package from './package/package.ts';

export default interface Action {
    execute(context:any, pkg:Package, parameters:string[]):void;
}
