import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import Shell from "../../cmd/shell.ts";
import Action from "../action.ts";

export default class ActivatePre implements Action {
  constructor(private config: Config) {
  }

  async execute(_pkg: Package | undefined, parameters: string[]) {
    const shell = new Shell(this.config, false);
    await shell.execute(parameters);
  }
}
