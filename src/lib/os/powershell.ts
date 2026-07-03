import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

export class Powershell {
  static async run(
    script: string,
    stripCRLF = false,
    ignoreErrors = false,
    params?: string[],
  ): Promise<string> {
    const args = [
      "powershell.exe",
      "-ExecutionPolicy",
      "Bypass",
      "-NoLogo",
      "-NonInteractive",
      "-NoProfile",
    ];

    if (script.endsWith(".ps1")) {
      args.push("-File");
      const resolvedFile = path.resolve(script);
      args.push(resolvedFile);
    } else {
      args.push(script);
    }

    if (params) {
      params.forEach((param) => {
        args.push(param);
      });
    }

    /*new Deno.Command("extra-bin/windows/os-utils/addToDesktop.cmd", {
      args: [resolvedTargetFile],
      stdout: "inherit",
      stderr: "inherit",
    });*/
    // %PWS% -File %currentFileDir%createShortcut.ps1 "%TARGET_FILE%" "%SHORTCUT_DIR%"
    const command = new Deno.Command(args[0], {
      args: args.splice(1),
      stderr: "piped",
      stdout: "piped",
    });
    const { success, stdout, stderr, code } = await command.output();


    if (!ignoreErrors && !success) {
      const stderrOutput = this.decodeOutput(stderr);
      throw new Error(`Powershell.run(${script}) terminated with code ${code}\n${stderrOutput}`);
    }

    let output = this.decodeOutput(stdout);
    log.debug(`stdout ${output}`);

    if (stripCRLF) {
      output = output
        .replace(/\r/g, "")
        .replace(/\n/g, "");
    }

    return output;
  }

  private static decodeOutput(output: Uint8Array) {
    return new TextDecoder().decode(output);
  }
}
