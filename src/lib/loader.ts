import * as log from "@std/log";

import type CommandFactory from "../cmd/command_factory.ts";
import type Command from "../cmd/command.ts";
import type ActionFactory from "../action/action_factory.ts";
import type Action from "../action/action.ts";

import type Package from "./package/package.ts"; 

import type Config from "./config.ts";
import { tokenizeArgs, tokenizeShellArgs } from "./parse_args.ts";

export default class Loader {
  private commandFactory: CommandFactory | null = null;
  private actionFactory: ActionFactory | null = null;
  
  constructor(private config: Config) {
  }

  async loadCommandFactory(): Promise<CommandFactory> {
    if (this.commandFactory == null) {
      const { default: CommandFactory } = await import("../cmd/command_factory.ts");
      this.commandFactory = new CommandFactory();
    }
    return this.commandFactory;
  }

  async command(cmd: string, args: string[]) {
    log.debug("");
    log.debug(`+ COMMAND: ${cmd} ${args}`);

    log.debug("");
    log.debug("==================================");
    log.debug(`${cmd} ${JSON.stringify(args)}`);
    const commandFactory = await this.loadCommandFactory();
    const handler: Command = commandFactory.get(cmd, this.config);
    await handler.execute(args);
  }

  async loadActionFactory(): Promise<ActionFactory> {
    if (this.actionFactory == null) {
      const { default: ActionFactory } = await import("../action/action_factory.ts");
      this.actionFactory = new ActionFactory();
    }
    return this.actionFactory;
  }

  async action(pkg: Package | undefined, cmdline: string): Promise<void> {
    log.debug("");
    log.debug(`+ ACTION: ${JSON.stringify(cmdline)}`);

    const tokens = tokenizeArgs(cmdline);
    const action = tokens.shift();

    if (!action) {
      throw new Error("No action to perform");
    }

    const args = tokens;
    log.debug(`- ARG-TOKENS ${args}`);
    const actionFactory = await this.loadActionFactory();
    const handler: Action = actionFactory.get(action, this.config);

    if (handler.executeShellTokens) {
      const shellTokens = tokenizeShellArgs(cmdline);
      shellTokens.shift();
      for (const token of shellTokens) {
        if (!token.isOperator) {
          token.value = await this.config.replaceVars(token.value, pkg?.name);
        }
      }
      await handler.executeShellTokens(pkg, shellTokens);
      return;
    }

    for (const index in args) {
      args[index] = await this.config.replaceVars(args[index], pkg?.name);
    }

    await handler.execute(pkg, args);
  }
}
