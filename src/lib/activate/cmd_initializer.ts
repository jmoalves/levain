

import * as log from "@std/log";
import { join } from "@std/path";
import t from "../i18n.ts";
import OsUtils from "../os/os_utils.ts";

export default class CmdInitializer {
  
  private levainHookPath: string;
  private hookCommand: string;

  constructor(
    private levainCmdPath: string,
    private levainDir: string
  ) {
    this.levainHookPath = join(levainDir, "levain-hook.cmd");
    this.hookCommand = `@CALL "${this.levainHookPath}"`;
  }

  public async install() {
    log.info("")
    log.info(t("lib.activate.cmd_initializer.install"));
    log.info(t("lib.activate.cmd_initializer.installHook", { hookPath: this.levainHookPath }));
    await this.createHook();

    const existing = await this.findExistingAutorun();
    // Update AutoRun if needed
    if (
      existing.toLowerCase().includes(this.hookCommand.toLowerCase())
    ) {
      log.info(t("lib.activate.cmd_initializer.existingAutorun"));
      return;
    }
    await this.registerAutorun(existing);
    log.info(t("lib.activate.cmd_initializer.installEnd"));
  }

  async createHook() {
    await Deno.mkdir(this.levainDir, { recursive: true });
    await Deno.writeTextFile(this.levainHookPath, this.hookTemplate());
  }

  async findExistingAutorun(): Promise<string> {
    // Read existing AutoRun
    let existing = "";

    try {
      const output = await OsUtils.runAndLog([
        "reg",
        "query",
        "HKCU\\Software\\Microsoft\\Command Processor",
        "/v",
        "AutoRun",
      ]);
      // Typical output:
      // HKEY_CURRENT_USER\Software\Microsoft\Command Processor
      //     AutoRun    REG_SZ    some command
      const match = output.match(/AutoRun\s+REG_\w+\s+([\s\S]*)$/m);

      if (match) {
        existing = match[1].trim();
      }
    } catch {
      // No AutoRun configured
    }
    return existing;
  }

  async registerAutorun(existing: string) {
    const newValue = existing.length === 0
      ? this.hookCommand
      : `${existing} & ${this.hookCommand}`;

    await OsUtils.runAndLog([
      "reg",
      "add",
      "HKCU\\Software\\Microsoft\\Command Processor",
      "/v",
      "AutoRun",
      "/t",
      "REG_SZ",
      "/d",
      newValue,
      "/f",
    ]);
  }

  hookTemplate(): string {
    return `@echo off
      if not defined _LEVAIN_OLD_PROMPT set "_LEVAIN_OLD_PROMPT=$P$G"
  
      doskey levain=call "${this.levainCmdPath}\\levain.cmd" $*
    `
  }
}