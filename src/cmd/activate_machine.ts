import t from "../lib/i18n.ts";

import Config from "../lib/config.ts";

import Command from "./command.ts";
import ActivateInit from "../action/activate/activate_init.ts";
import ActivatePre from "../action/activate/activate_pre.ts";
import ActivateCmd from "../action/activate/activate_cmd.ts";

export default class ActivateMachine implements Command {
  // This command prepares shell programs to be able to run levain activate
  constructor(private config: Config) {
  }

  // For cmder, install it with .\levain.ps1 _activate-machine init --dev --skip-cmd --skip-bash --powershell-profile C:\dev-env\cmder\config\user_profile.ps1
  async execute(args: string[]) {
    let action = undefined;
    if (args[0] == "init") {
      action = new ActivateInit(this.config);
    } else if (args[0] == "pre") {
      action = new ActivatePre(this.config);
    } else if (args[0] == "cmd") {
      action = new ActivateCmd(this.config);
    }else {
      throw new Error("Action must be init|pre|cmd")
    }
    await action.execute(undefined, args.slice(1))
  }
  
  readonly oneLineExample = t("cmd.shell.example");
}
