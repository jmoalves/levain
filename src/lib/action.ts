import Package from './package';

export default interface Action {
    execute(pkg:Package, parameters:string[]):void;
}
