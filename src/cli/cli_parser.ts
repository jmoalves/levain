import { Command, ValidationError } from "@cliffy/command";

import LevainVersion from "../levain_version.ts";
import t from "../lib/i18n.ts";
import StringUtils from "../lib/utils/string_utils.ts";

export { ValidationError as CliValidationError };

export type ParsedCliResult =
  | { kind: "handled" }
  | { kind: "run"; myArgs: Record<string, any> };

const PUBLIC_COMMAND_NAMES = [
  "install",
  "update",
  "shell",
  "activate",
  "list",
  "clean",
  "actions",
  "info",
  "explain",
  "clone",
];

const GLOBAL_OPTION_NAMES = [
  "--levainHome",
  "--addRepo",
  "--tempRepo",
  "--add-log",
  "--add-log-dir",
  "--email-domain",
  "--levainCache",
  "--shellPath",
  "--ask-fullname",
  "--ask-login",
  "--ask-email",
  "--ask-password",
  "--wait-after-end",
  "--skip-levain-updates",
  "--skip-auto-clean",
  "--help",
  "--version",
];

function formatUnknownOptionError(flagName: string, allowedSubOptions: string[]): ValidationError {
  const allOptions = [...GLOBAL_OPTION_NAMES, ...allowedSubOptions];
  const similar = [...StringUtils.findSimilar(flagName, allOptions, 3)];
  const base = t("cli.error.unknownOption", { option: flagName });
  const hint = similar.length > 0 ? ` ${t("cli.error.didYouMean", { suggestions: similar.join(", ") })}` : "";
  return new ValidationError(`${base}${hint}`);
}

function assertNoUnknownOptionTokens(
  positionals: string[],
  allowedSubOptions: string[],
): void {
  for (const token of positionals) {
    if (token.startsWith("-") && token.length > 1) {
      const flagName = token.split("=")[0];
      throw formatUnknownOptionError(flagName, allowedSubOptions);
    }
  }
}

function mapGlobalOptions(rawOpts: unknown): Record<string, any> {
  const opts = (rawOpts && typeof rawOpts === "object" ? rawOpts : {}) as Record<string, unknown>;
  const myArgs: Record<string, any> = { _: [] };

  if (opts.emailDomain !== undefined) myArgs["email-domain"] = opts.emailDomain;
  if (opts.levainCache !== undefined) myArgs.levainCache = opts.levainCache;
  if (opts.shellPath !== undefined) myArgs.shellPath = opts.shellPath;

  if (opts.levainHome !== undefined) myArgs.levainHome = opts.levainHome;
  if (opts.addRepo !== undefined) myArgs.addRepo = opts.addRepo;
  if (opts.tempRepo !== undefined) myArgs.tempRepo = opts.tempRepo;
  if (opts.addLog !== undefined) myArgs["add-log"] = opts.addLog;
  if (opts.addLogDir !== undefined) myArgs["add-log-dir"] = opts.addLogDir;

  if (opts.askFullname) myArgs["ask-fullname"] = true;
  if (opts.askLogin) myArgs["ask-login"] = true;
  if (opts.askEmail) myArgs["ask-email"] = true;
  if (opts.askPassword) myArgs["ask-password"] = true;
  if (opts.waitToBegin) myArgs["wait-to-begin"] = true;
  if (opts.waitAfterEnd) myArgs["wait-after-end"] = true;
  if (opts.skipLevainUpdates) myArgs["skip-levain-updates"] = true;
  if (opts.skipAutoClean) myArgs["skip-auto-clean"] = true;
  if (opts.levainUpgrade) myArgs["levain-upgrade"] = true;

  return myArgs;
}

export function createLevainCommand(
  onDispatch: (myArgs: Record<string, any>) => void,
) {
  const versionStr = LevainVersion.levainVersion.versionNumber;

  const cli = new Command()
    .name("levain")
    .version(versionStr)
    .description(t("cli.description"))
    .noExit()
    .throwErrors()
    .globalOption("--levainHome <dir:string>", t("cli.option.levainHome"), { collect: true })
    .globalOption("--addRepo <repo:string>", t("cli.option.addRepo"), { collect: true })
    .globalOption("--tempRepo <repo:string>", t("cli.option.tempRepo"), { collect: true })
    .globalOption("--levainCache <dir:string>", t("cli.option.levainCache"))
    .globalOption("--shellPath <path:string>", t("cli.option.shellPath"))
    .globalOption("--skip-levain-updates", t("cli.option.skipLevainUpdates"))
    .globalOption("--skip-auto-clean", t("cli.option.skipAutoClean"))
    .globalOption("--wait-after-end", t("cli.option.waitAfterEnd"))
    .group(t("cli.group.logging"))
    .globalOption("--add-log <file:string>", t("cli.option.addLog"), { collect: true })
    .globalOption("--add-log-dir <dir:string>", t("cli.option.addLogDir"), { collect: true })
    .group(t("cli.group.userSetup"))
    .globalOption("--email-domain <domain:string>", t("cli.option.emailDomain"))
    .globalOption("--ask-fullname", t("cli.option.askFullname"))
    .globalOption("--ask-login", t("cli.option.askLogin"))
    .globalOption("--ask-email", t("cli.option.askEmail"))
    .globalOption("--ask-password", t("cli.option.askPassword"))
    .globalOption("--wait-to-begin", t("cli.option.waitToBegin"), { hidden: true })
    .globalOption("--levain-upgrade", t("cli.option.levainUpgrade"), { hidden: true })
    .example(t("cli.example.root.list"), "levain list")
    .example(t("cli.example.root.install"), "levain install jdk maven")
    .example(t("cli.example.root.activate"), "levain activate")
    .example(t("cli.example.root.explain"), "levain explain maven")
    .example(t("cli.example.root.update"), "levain update")
    .action((opts) => {
      onDispatch(mapGlobalOptions(opts as Record<string, unknown>));
    });

  const installCmd = new Command()
    .description(t("cli.cmd.install.description"))
    .option("--force", t("cli.cmd.install.force"))
    .option("--noUpdate", t("cli.cmd.install.noUpdate"))
    .example(t("cli.example.install.project"), "levain install")
    .example(t("cli.example.install.packages"), "levain install jdk maven")
    .example(t("cli.example.install.force"), "levain install --force git")
    .arguments("[packages...:string]")
    .action((opts, ...packages: string[]) => {
      assertNoUnknownOptionTokens(packages, ["--force", "--noUpdate"]);
      const literal = installCmd.getLiteralArgs();
      const subArgs: string[] = [];
      if (opts.force) subArgs.push("--force");
      if (opts.noUpdate) subArgs.push("--noUpdate");
      subArgs.push(...packages);
      if (literal.length > 0) subArgs.push("--", ...literal);
      const myArgs = mapGlobalOptions(opts as Record<string, unknown>);
      myArgs._ = ["install", ...subArgs];
      onDispatch(myArgs);
    });
  cli.command("install", installCmd);

  const updateCmd = new Command()
    .description(t("cli.cmd.update.description"))
    .option("--force", t("cli.cmd.update.force"))
    .example(t("cli.example.update.all"), "levain update")
    .example(t("cli.example.update.packages"), "levain update jdk maven")
    .arguments("[packages...:string]")
    .action((opts, ...packages: string[]) => {
      assertNoUnknownOptionTokens(packages, ["--force"]);
      const literal = updateCmd.getLiteralArgs();
      const subArgs: string[] = [];
      if (opts.force) subArgs.push("--force");
      subArgs.push(...packages);
      if (literal.length > 0) subArgs.push("--", ...literal);
      const myArgs = mapGlobalOptions(opts as Record<string, unknown>);
      myArgs._ = ["update", ...subArgs];
      onDispatch(myArgs);
    });
  cli.command("update", updateCmd);

  const shellCmd = new Command()
    .description(t("cli.cmd.shell.description"))
    .example(t("cli.example.shell.project"), "levain shell")
    .example(t("cli.example.shell.packages"), "levain shell jdk maven")
    .arguments("[packages...:string]")
    .action((opts, ...packages: string[]) => {
      assertNoUnknownOptionTokens(packages, []);
      const literal = shellCmd.getLiteralArgs();
      const myArgs = mapGlobalOptions(opts);
      myArgs._ = ["shell", ...packages, ...literal];
      onDispatch(myArgs);
    });
  cli.command("shell", shellCmd);

  const activateCmd = new Command()
    .description(t("cli.cmd.activate.description"))
    .option("--skip-pre", t("cli.cmd.activate.skipPre"))
    .example(t("cli.example.activate.project"), "levain activate")
    .example(t("cli.example.activate.packages"), "levain activate jdk")
    .example(t("cli.example.activate.skipPre"), "levain activate --skip-pre jdk")
    .arguments("[packages...:string]")
    .action((opts, ...packages: string[]) => {
      assertNoUnknownOptionTokens(packages, ["--skip-pre"]);
      const literal = activateCmd.getLiteralArgs();
      const subArgs: string[] = [];
      if (opts.skipPre) subArgs.push("--skip-pre");
      subArgs.push(...packages, ...literal);
      const myArgs = mapGlobalOptions(opts);
      myArgs._ = ["activate", ...subArgs];
      onDispatch(myArgs);
    });
  cli.command("activate", activateCmd);

  const listCmd = new Command()
    .description(t("cli.cmd.list.description"))
    .example(t("cli.example.list.all"), "levain list")
    .example(t("cli.example.list.filter"), "levain list jdk")
    .arguments("[search...:string]")
    .action((opts, ...search: string[]) => {
      assertNoUnknownOptionTokens(search, []);
      const literal = listCmd.getLiteralArgs();
      const myArgs = mapGlobalOptions(opts);
      myArgs._ = ["list", ...search, ...literal];
      onDispatch(myArgs);
    });
  cli.command("list", listCmd);

  const cleanCmd = new Command()
    .description(t("cli.cmd.clean.description"))
    .option("--cache", t("cli.cmd.clean.cache"))
    .option("--backup", t("cli.cmd.clean.backup"))
    .option("--temp", t("cli.cmd.clean.temp"))
    .option("--logs", t("cli.cmd.clean.logs"))
    .option("--all", t("cli.cmd.clean.all"))
    .option("--deep", t("cli.cmd.clean.deep"))
    .example(t("cli.example.clean.default"), "levain clean")
    .example(t("cli.example.clean.all"), "levain clean --all --deep")
    .action((opts) => {
      const subArgs: string[] = [];
      if (opts.cache) subArgs.push("--cache");
      if (opts.backup) subArgs.push("--backup");
      if (opts.temp) subArgs.push("--temp");
      if (opts.logs) subArgs.push("--logs");
      if (opts.all) subArgs.push("--all");
      if (opts.deep) subArgs.push("--deep");
      const myArgs = mapGlobalOptions(opts);
      myArgs._ = ["clean", ...subArgs];
      onDispatch(myArgs);
    });
  cli.command("clean", cleanCmd);

  const actionsCmd = new Command()
    .description(t("cli.cmd.actions.description"))
    .example(t("cli.example.actions.all"), "levain actions")
    .example(t("cli.example.actions.filter"), "levain actions template")
    .arguments("[search...:string]")
    .action((opts, ...search: string[]) => {
      assertNoUnknownOptionTokens(search, []);
      const literal = actionsCmd.getLiteralArgs();
      const myArgs = mapGlobalOptions(opts);
      myArgs._ = ["actions", ...search, ...literal];
      onDispatch(myArgs);
    });
  cli.command("actions", actionsCmd);

  const infoCmd = new Command()
    .description(t("cli.cmd.info.description"))
    .option("--verbose", t("cli.cmd.info.verbose"))
    .option("--json", t("cli.cmd.info.json"))
    .example(t("cli.example.info.default"), "levain info maven")
    .example(t("cli.example.info.verbose"), "levain info --verbose jdk")
    .example(t("cli.example.info.json"), "levain info --json jdk maven")
    .arguments("[packages...:string]")
    .action((opts, ...packages: string[]) => {
      assertNoUnknownOptionTokens(packages, ["--verbose", "--json"]);
      const literal = infoCmd.getLiteralArgs();
      const subArgs: string[] = [];
      if (opts.verbose) subArgs.push("--verbose");
      if (opts.json) subArgs.push("--json");
      subArgs.push(...packages);
      if (literal.length > 0) subArgs.push("--", ...literal);
      const myArgs = mapGlobalOptions(opts);
      myArgs._ = ["info", ...subArgs];
      onDispatch(myArgs);
    });
  cli.command("info", infoCmd);

  const explainCmd = new Command()
    .description(t("cli.cmd.explain.description"))
    .option("--raw", t("cli.cmd.explain.raw"))
    .option("--uninstall", t("cli.cmd.explain.uninstall"))
    .example(t("cli.example.explain.project"), "levain explain")
    .example(t("cli.example.explain.playbook"), "levain explain maven")
    .example(t("cli.example.explain.markdown"), "levain explain maven > setup-guide.md")
    .example(t("cli.example.explain.raw"), "levain explain --raw maven")
    .example(t("cli.example.explain.uninstallAll"), "levain explain --uninstall > cleanup.md")
    .example(t("cli.example.explain.uninstallPackage"), "levain explain --uninstall maven")
    .arguments("[packages...:string]")
    .action((opts, ...packages: string[]) => {
      assertNoUnknownOptionTokens(packages, ["--raw", "--uninstall"]);
      if (opts.raw && opts.uninstall) {
        throw new ValidationError(t("cmd.explain.uninstall.rawConflict"));
      }
      const literal = explainCmd.getLiteralArgs();
      const subArgs: string[] = [];
      if (opts.raw) subArgs.push("--raw");
      if (opts.uninstall) subArgs.push("--uninstall");
      subArgs.push(...packages);
      if (literal.length > 0) subArgs.push("--", ...literal);
      const myArgs = mapGlobalOptions(opts);
      myArgs._ = ["explain", ...subArgs];
      onDispatch(myArgs);
    });
  cli.command("explain", explainCmd);

  const cloneCmd = new Command()
    .description(t("cli.cmd.clone.description"))
    .option("--dirs", t("cli.cmd.clone.dirs"))
    .example(t("cli.example.clone.basic"), "levain clone https://github.com/org/repo.git")
    .example(t("cli.example.clone.dirs"), "levain clone --dirs git@github.com:org/repo.git")
    .arguments("<url:string>")
    .action((opts, url: string) => {
      assertNoUnknownOptionTokens([url], ["--dirs"]);
      const literal = cloneCmd.getLiteralArgs();
      const subArgs: string[] = [];
      if (opts.dirs) subArgs.push("--dirs");
      subArgs.push(url);
      if (literal.length > 0) subArgs.push("--", ...literal);
      const myArgs = mapGlobalOptions(opts);
      myArgs._ = ["clone", ...subArgs];
      onDispatch(myArgs);
    });
  cli.command("clone", cloneCmd);

  const activateMachineCmd = new Command()
    .description(t("cli.cmd.activateMachine.description"))
    .hidden()
    .stopEarly()
    .arguments("[args...:string]")
    .action((opts, ...args: string[]) => {
      const myArgs = mapGlobalOptions(opts);
      myArgs._ = ["_activate-machine", ...args];
      onDispatch(myArgs);
    });
  cli.command("_activate-machine", activateMachineCmd);

  return cli;
}

const SUBCOMMAND_OPTIONS: Record<string, string[]> = {
  install: ["--force", "--noUpdate"],
  update: ["--force"],
  activate: ["--skip-pre"],
  clean: ["--cache", "--backup", "--temp", "--logs", "--all", "--deep"],
  info: ["--verbose", "--json"],
  explain: ["--raw", "--uninstall"],
  clone: ["--dirs"],
};

function localizeValidationError(err: ValidationError, cmdArgs: string[]): ValidationError {
  const unknownCmdMatch = err.message.match(/^Unknown command "([^"]+)"/);
  if (unknownCmdMatch) {
    const unknownCmd = unknownCmdMatch[1];
    if (unknownCmd === "uninstall" || unknownCmd === "remove") {
      return new ValidationError(t("cli.error.uninstallHint", { cmd: unknownCmd }));
    }
    const similar = [...StringUtils.findSimilar(unknownCmd, PUBLIC_COMMAND_NAMES, 5)];
    const base = t("cmd.command_factory.notFound", { cmd: unknownCmd });
    const hint = similar.length > 0 ? ` ${t("cli.error.didYouMean", { suggestions: similar.join(", ") })}` : "";
    return new ValidationError(`${base}.${hint}`);
  }

  const unknownOptMatch = err.message.match(/^Unknown option "([^"]+)"/);
  if (unknownOptMatch) {
    const unknownOpt = unknownOptMatch[1];
    const matchedCmd = cmdArgs.find((arg) => PUBLIC_COMMAND_NAMES.includes(arg));
    const subOpts = matchedCmd ? (SUBCOMMAND_OPTIONS[matchedCmd] ?? []) : [];
    return formatUnknownOptionError(unknownOpt, subOpts);
  }

  return err;
}

export async function parseCliArgs(cmdArgs: string[] = []): Promise<ParsedCliResult> {
  let dispatched: Record<string, any> | undefined;
  const cli = createLevainCommand((myArgs) => {
    dispatched = myArgs;
  });

  try {
    await cli.parse(cmdArgs);
  } catch (err) {
    if (err instanceof ValidationError) {
      throw localizeValidationError(err, cmdArgs);
    }
    throw err;
  }

  if (!dispatched) {
    return { kind: "handled" };
  }

  return { kind: "run", myArgs: dispatched };
}

export function getCliHelpText(colors = false): string {
  return createLevainCommand(() => {}).getHelp({ colors });
}
