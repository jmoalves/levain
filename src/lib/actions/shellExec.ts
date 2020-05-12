import * as runCmd from 'node-run-cmd';

import Action from '../action';
import Package from '../package';

export default class ShellExecAction implements Action {
  execute(pkg:Package, parameters:string[]): void {
    console.log(pkg.name, "@", pkg.rootDir, "=> ShellExec", parameters);
    this.runCmd(pkg, parameters);
  }

  private async runCmd(pkg:Package, parameters:string[]) {
    await runCmd.run(parameters, { shell: true, verbose: true, cwd: pkg.rootDir });
    console.log("OK - ShellExec", parameters);
  }
}
