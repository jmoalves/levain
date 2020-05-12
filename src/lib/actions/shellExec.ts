import Action from '../action';
import Package from '../package';

export default class ShellExecAction implements Action {
  execute(pkg:Package, parameters:string[]): void {
    console.log(pkg.name, "@", pkg.rootDir, "=> ShellExec", parameters);
  }
}
