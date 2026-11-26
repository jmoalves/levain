import * as path from "@std/path";
import * as log from "@std/log";
import * as fs from "@std/fs";
import { ArrayUtils } from "../utils/array_utils.ts";
import { envChain } from "../utils/utils.ts";
import { FileUtils } from "../fs/file_utils.ts";
import { isNotFoundFileError } from "../utils/error_utils.ts";
import HomePaths from "../paths/home_paths.ts";

export default class OsUtils {
  static get login(): string {
    const userEnvStrings = ["USERID", "USER", "user", "username"];
    const userFromEnv = envChain(...userEnvStrings);
    if (!userFromEnv) {
      throw new Error(`User not found. Looked for env vars ${userEnvStrings.join()}`);
    }
    return userFromEnv;
  }

  static get hostname(): string | undefined {
    const hostEnvStrings = ["COMPUTERNAME", "HOSTNAME"];
    const hostFromEnv = envChain(...hostEnvStrings);
    if (hostFromEnv) {
      return hostFromEnv;
    }

    try {
      const osHostname = Deno.hostname();
      if (osHostname) {
        return osHostname;
      }
    } catch {
      // Ignore if hostname syscall is unavailable
    }

    log.debug(
      `Hostname not found. Looked for env vars ${hostEnvStrings.join()}`,
    );
    return undefined;
  }

  static onlyInWindows(isError = true) {
    if (!OsUtils.isWindows()) {
      const message = `${OsUtils.getOs()} not supported`;
      if (isError) {
        throw new Error(message);
      } else {
        log.warn(message);
      }
    }
  }

  static windowsToBashPath(path: string): string {
    // Already looks like a Unix path.
    if (path.startsWith("/")) {
      return path;
    }

    // Match drive letter.
    const match = path.match(/^([A-Za-z]):[\\/](.*)$/);
    if (!match) {
      return path.replace(/\\/g, "/");
    }

    const [, drive, rest] = match;
    return `/${drive.toLowerCase()}/${rest.replace(/\\/g, "/")}`;
  }

  static async exists(path: string): Promise<boolean> {
    try {
      await FileUtils.getFileInfo(path);
      return true;
    } catch (err) {
      if (isNotFoundFileError(err)) {
        return false;
      }
      throw err;
    }
  }

  static isWindows(): boolean {
    return this.getOs() === "windows";
  }

  static isPosix(): boolean {
    return this.isMacOs() || this.isLinux();
  }

  static isMacOs(): boolean {
    return this.getOs() === "darwin";
  }

  static isLinux(): boolean {
    return this.getOs() === "linux";
  }

  static getOs(): string {
    return Deno.build.os;
  }

  static async setEnvPermanent(key: string, value: string) {
    OsUtils.onlyInWindows();

    if (!key || /[=\r\n\0]/.test(key) || key.startsWith("-") || key.startsWith("/")) {
      throw new Error(`Invalid environment variable name: ${key}`);
    }
    if (value.includes("\0")) {
      throw new Error(`Environment variable "${key}" must not contain NUL characters`);
    }

    this.setEnv(key, value);

    // setx.exe parses any arg starting with '-' or '/' as a flag (no '--' delimiter)
    // and silently truncates values longer than 1024 characters.
    const safeForSetx = value.length <= 1024 &&
      !value.startsWith("-") &&
      !value.startsWith("/") &&
      !/[\r\n]/.test(value);

    if (safeForSetx) {
      await this.runAndLog(["setx", key, value]);
      return;
    }

    const psCmd = new Deno.Command(OsUtils.windowsPowershellExe(), {
      args: [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "[Environment]::SetEnvironmentVariable($env:__LEVAIN_SETENV_KEY, $env:__LEVAIN_SETENV_VAL, 'User')",
      ],
      clearEnv: true,
      env: OsUtils.windowsPowershellEnv({
        __LEVAIN_SETENV_KEY: key,
        __LEVAIN_SETENV_VAL: value,
      }),
      stdout: "piped",
      stderr: "piped",
    });
    const { success, stderr, code } = await psCmd.output();
    if (!success) {
      const errText = OsUtils.decodeOutput(stderr).trim();
      throw new Error(`Error ${code} setting permanent environment variable "${key}": ${errText}`);
    }
  }

  static setEnv(key: string, value: string) {
    Deno.env.set(key, value);
  }

  static async addPathPermanent(newPathItem: string): Promise<string> {
    OsUtils.onlyInWindows();
    if (/[;\r\n\0]/.test(newPathItem)) {
      throw new Error(`Invalid PATH entry: "${newPathItem}" must not contain ';', CR, LF, or NUL`);
    }

    const path = await this.getUserPath();
    const newPath = ArrayUtils.remove(path, newPathItem);
    newPath.unshift(newPathItem);

    return await this.setUserPath(newPath);
  }

  static async removePathPermanent(itemToRemove: string): Promise<string> {
    OsUtils.onlyInWindows();

    const path = await this.getUserPath();
    const newPath = ArrayUtils.remove(path, itemToRemove);
    return await this.setUserPath(newPath);
  }

  static async isInUserPath(pathItem: string) {
    const path = await this.getUserPath();
    return path.includes(pathItem);
  }

  static async runAndLog(
    command: string | string[],
    workDir = ".",
  ): Promise<string> {
    log.debug(`runAndLog\n${command}`);

    let args: string[];
    let exec: string;

    if (typeof command === "string") {
      [exec, ...args] = OsUtils.parseCmd(command);
    } else if (command instanceof Array) {
      [exec, ...args] = command;
    } else {
      log.error(command);
      throw new Error(`********** Unknown command type ${typeof command}`);
    }
  
    const dcommand = new Deno.Command(exec, {
      args: args,
      cwd: workDir,
      stderr: "piped",
      stdout: "piped",
    });
    const { success, stdout, stderr, code } = await dcommand.output();

    log.debug(`status ${JSON.stringify({ success, code })}`);

    if (!success) {
      const stderrOutput = OsUtils.decodeOutput(stderr);
      throw new Error(`Error ${code} running "${command}\n${stderrOutput}"`);
    }

    const output = OsUtils.decodeOutput(stdout);

    // TODO it should not be necessary to remove \u0000 from stdout. Is it a bug in Deno 1.13.2?
    // deno-lint-ignore no-control-regex
    const cleanOutput = output.replaceAll(/\u0000/gm, "");

    log.debug(`stdout ${cleanOutput}`);
    return cleanOutput;
  }

  static decodeOutput(output: Uint8Array) {
    return new TextDecoder().decode(output);
  }

  static async clearConsole() {
    const cmdLine = OsUtils.isWindows() ? "cmd /c cls" : "clear";
    const cmd = cmdLine.split(" ");
    return await OsUtils.runAndLog(cmd);
  }

  static makeReadOnly(path: string) {
    Deno.chmodSync(path, 0o444);
  }

  static removePermissions(path: string) {
    Deno.chmodSync(path, 0);
  }

  static makeReadWrite(path: string) {
    Deno.chmodSync(path, 0o777);
  }

  static async sanitizeUserPath() {
    if (OsUtils.isWindows()) {
      const path = await this.getUserPath();
      const sanitizedPath = this.sanitizePathArray(path);
      const hasChanges = path.length !== sanitizedPath.length ||
        path.some((entry, idx) => entry !== sanitizedPath[idx]);
      if (hasChanges) {
        await this.setUserPath(sanitizedPath);
      }
    }
  }

  static sanitizePathArray(path: string[]): string[] {
    return path.map((part) => this.sanitizePathString(part));
  }

  static sanitizePathString(path: string): string {
    return path.replace(/"/g, "");
  }

  static windowsSystemToolPath(relativeToolPath: string): string {
    const systemRoot = Deno.env.get("SystemRoot") || Deno.env.get("WINDIR") || "C:\\Windows";
    return path.join(systemRoot, "System32", relativeToolPath);
  }

  private static windowsPowershellExe(): string {
    const candidate = OsUtils.windowsSystemToolPath(path.join("WindowsPowerShell", "v1.0", "powershell.exe"));
    return fs.existsSync(candidate) ? candidate : "powershell.exe";
  }

  /**
   * Builds the child environment for Windows PowerShell 5.1 (`powershell.exe`),
   * stripping `PSModulePath` so a parent PowerShell 7 (`pwsh`) session does not
   * break built-in 5.1 modules (`ConvertTo-Json`, `New-Object`, etc.).
   */
  static windowsPowershellEnv(
    extraEnv?: Record<string, string>,
    baseEnv: Record<string, string> = Deno.env.toObject(),
  ): Record<string, string> {
    const cleanEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(baseEnv)) {
      if (k.toLowerCase() !== "psmodulepath") {
        cleanEnv[k] = v;
      }
    }
    if (extraEnv) {
      for (const [k, v] of Object.entries(extraEnv)) {
        cleanEnv[k] = v;
      }
    }
    return cleanEnv;
  }

  static findInPath(
    binaryName: string,
    windowsAllowedExtensions: string[] = [".EXE", ".COM", ".CMD", ".BAT"],
  ): string | undefined {
    const rawPath = Deno.env.get("PATH") ?? Deno.env.get("Path") ?? "";
    if (!rawPath || !binaryName) {
      return undefined;
    }

    const dirs = rawPath.split(path.DELIMITER).filter((dir) => dir.trim().length > 0);
    const isWin = OsUtils.isWindows();
    const candidates: string[] = [];

    if (isWin && !/\.[a-z0-9]+$/i.test(binaryName)) {
      const allowedSet = new Set(windowsAllowedExtensions.map((ext) => ext.toUpperCase()));
      const rawPathext = (Deno.env.get("PATHEXT") || ".EXE;.COM;.CMD;.BAT")
        .split(";")
        .map((ext) => ext.trim().toUpperCase())
        .filter((ext) => ext.length > 0 && allowedSet.has(ext));
      const exts = rawPathext.length > 0 ? rawPathext : Array.from(allowedSet);
      for (const ext of exts) {
        candidates.push(`${binaryName}${ext}`);
      }
    } else {
      candidates.push(binaryName);
    }

    for (const dir of dirs) {
      const cleanDir = dir.trim().replace(/^"|"$/g, "");
      if (!cleanDir || !path.isAbsolute(cleanDir)) continue;
      for (const name of candidates) {
        const fullPath = path.join(cleanDir, name);
        try {
          const stat = Deno.statSync(fullPath);
          if (!stat.isFile) continue;
          if (Deno.build.os !== "windows" && !isWin && stat.mode != null && (stat.mode & 0o111) === 0) continue;
          return fullPath;
        } catch {
          continue;
        }
      }
    }

    return undefined;
  }

  static parseUserPathRegistryJson(
    stdout: string,
  ): { exists: boolean; value: string; type: string } {
    const trimmed = stdout.trim();
    if (!trimmed) {
      throw new Error("Empty response while reading HKCU\\Environment\\Path");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new Error(`Invalid JSON while reading HKCU\\Environment\\Path: ${err}`);
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).exists !== "boolean" ||
      typeof (parsed as Record<string, unknown>).value !== "string"
    ) {
      throw new Error("Unexpected response shape while reading HKCU\\Environment\\Path");
    }
    const record = parsed as { exists: boolean; value: string; type?: unknown };
    return {
      exists: record.exists,
      value: record.value,
      type: typeof record.type === "string" ? record.type : "ExpandString",
    };
  }

  private static broadcastEnvironmentChange(): void {
    if (!OsUtils.isWindows()) {
      return;
    }
    try {
      const envUtf16 = new Uint16Array(Array.from("Environment\0", (ch) => ch.charCodeAt(0)));
      const user32 = Deno.dlopen("user32.dll", {
        SendMessageTimeoutW: {
          parameters: ["usize", "u32", "usize", "buffer", "u32", "u32", "pointer"],
          result: "isize",
        },
      });
      try {
        // HWND_BROADCAST = 0xFFFF, WM_SETTINGCHANGE = 0x001A, SMTO_ABORTIFHUNG = 0x0002
        user32.symbols.SendMessageTimeoutW(
          0xFFFFn,
          0x001A,
          0n,
          new Uint8Array(envUtf16.buffer),
          0x0002,
          1000,
          null,
        );
      } finally {
        user32.close();
      }
    } catch (err) {
      log.debug(`Best-effort WM_SETTINGCHANGE broadcast skipped: ${err}`);
    }
  }

  static async getUserPath(): Promise<string[]> {
    this.onlyInWindows();
    const psScript = [
      "$ErrorActionPreference = 'Stop'",
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
      "$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $false)",
      "try {",
      "  if ($null -eq $key) {",
      "    [PSCustomObject]@{ exists = $false; type = 'ExpandString'; value = '' } | ConvertTo-Json -Compress",
      "  } else {",
      "    $val = $key.GetValue('Path', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)",
      "    if ($null -eq $val) {",
      "      [PSCustomObject]@{ exists = $false; type = 'ExpandString'; value = '' } | ConvertTo-Json -Compress",
      "    } else {",
      "      $kind = $key.GetValueKind('Path').ToString()",
      "      [PSCustomObject]@{ exists = $true; type = $kind; value = [string]$val } | ConvertTo-Json -Compress",
      "    }",
      "  }",
      "} finally {",
      "  if ($null -ne $key) { $key.Dispose() }",
      "}",
    ].join("\n");

    const psCmd = new Deno.Command(OsUtils.windowsPowershellExe(), {
      args: ["-NoLogo", "-NonInteractive", "-NoProfile", "-Command", psScript],
      clearEnv: true,
      env: OsUtils.windowsPowershellEnv(),
      stdout: "piped",
      stderr: "piped",
    });
    const { success, stdout, stderr, code } = await psCmd.output();
    if (!success) {
      const errText = OsUtils.decodeOutput(stderr).trim();
      throw new Error(`Error ${code} reading HKCU\\Environment\\Path: ${errText}`);
    }

    const regEntry = OsUtils.parseUserPathRegistryJson(OsUtils.decodeOutput(stdout));
    if (!regEntry.exists || !regEntry.value) {
      return [];
    }
    return regEntry.value.split(";");
  }

  static async setUserPath(pathEntries: string[]): Promise<string> {
    this.onlyInWindows();
    for (const entry of pathEntries) {
      if (/[\r\n\0]/.test(entry)) {
        throw new Error(`Invalid PATH entry: must not contain CR, LF, or NUL`);
      }
    }

    const pathString = pathEntries.join(";");
    const sanitizedPath = this.sanitizePathString(pathString);

    const psScript = [
      "$ErrorActionPreference = 'Stop'",
      "$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)",
      "if ($null -eq $key) { $key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment') }",
      "try {",
      "  $kind = [Microsoft.Win32.RegistryValueKind]::ExpandString",
      "  if ($null -ne $key.GetValue('Path', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)) {",
      "    $existingKind = $key.GetValueKind('Path')",
      "    if ($existingKind -eq [Microsoft.Win32.RegistryValueKind]::String -or $existingKind -eq [Microsoft.Win32.RegistryValueKind]::ExpandString) {",
      "      $kind = $existingKind",
      "    }",
      "  }",
      "  $newVal = if ($null -eq $env:__LEVAIN_USER_PATH) { '' } else { $env:__LEVAIN_USER_PATH }",
      "  $key.SetValue('Path', $newVal, $kind)",
      "} finally {",
      "  $key.Dispose()",
      "}",
    ].join("\n");

    const psCmd = new Deno.Command(OsUtils.windowsPowershellExe(), {
      args: ["-NoLogo", "-NonInteractive", "-NoProfile", "-Command", psScript],
      clearEnv: true,
      env: OsUtils.windowsPowershellEnv({
        __LEVAIN_USER_PATH: sanitizedPath,
      }),
      stdout: "piped",
      stderr: "piped",
    });
    const { success, stdout, stderr, code } = await psCmd.output();
    if (!success) {
      const errText = OsUtils.decodeOutput(stderr).trim();
      throw new Error(`Error ${code} writing HKCU\\Environment\\Path: ${errText}`);
    }

    OsUtils.broadcastEnvironmentChange();
    return OsUtils.decodeOutput(stdout);
  }

  static async createShortcut(
    oldPath: string | string[],
    newPath: string | string[],
  ) {
    const oldPathResolved = OsUtils.resolvePath(oldPath);
    const newPathResolved = OsUtils.resolvePath(newPath);
    log.debug(`createShortcut ${oldPathResolved} ${newPathResolved}`);

    fs.ensureDirSync(newPathResolved);

    if (OsUtils.isWindows()) {
      const targetDir = path.dirname(oldPathResolved);
      const shortcutFile = path.join(newPathResolved, `${path.basename(oldPathResolved)}.lnk`);
      const psScript = [
        "$ErrorActionPreference = 'Stop'",
        "$ws = New-Object -ComObject WScript.Shell",
        "$s = $ws.CreateShortcut($env:__LEVAIN_SHORTCUT_FILE)",
        "$s.WorkingDirectory = $env:__LEVAIN_SHORTCUT_WORKDIR",
        "$s.TargetPath = $env:__LEVAIN_SHORTCUT_TARGET",
        "$s.Save()",
      ].join("\n");

      const psCmd = new Deno.Command(OsUtils.windowsPowershellExe(), {
        args: ["-NoLogo", "-NonInteractive", "-NoProfile", "-Command", psScript],
        clearEnv: true,
        env: OsUtils.windowsPowershellEnv({
          __LEVAIN_SHORTCUT_TARGET: oldPathResolved,
          __LEVAIN_SHORTCUT_WORKDIR: targetDir,
          __LEVAIN_SHORTCUT_FILE: shortcutFile,
        }),
        stdout: "piped",
        stderr: "piped",
      });
      const { success, stdout, stderr, code } = await psCmd.output();
      if (!success) {
        const errText = OsUtils.decodeOutput(stderr).trim();
        throw new Error(`Error ${code} creating Windows shortcut for "${oldPathResolved}": ${errText}`);
      }
      return OsUtils.decodeOutput(stdout);
    }

    const linkPath = path.join(newPathResolved, path.basename(oldPathResolved));
    try {
      const existing = Deno.lstatSync(linkPath);
      if (existing.isSymlink) {
        Deno.removeSync(linkPath);
      }
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) {
        throw err;
      }
    }
    Deno.symlinkSync(oldPathResolved, linkPath);
    return linkPath;
  }

  static resolvePath(unresolvedPath: string | string[]): string {
    if (!unresolvedPath) {
      return "";
    }

    let pathArray = [];

    if (unresolvedPath instanceof Array) {
      pathArray = unresolvedPath as string[];
      if (pathArray[0]) {
        pathArray[0] = pathArray[0].replace("file:///", "");
      }
    } else {
      const stringPath = unresolvedPath as string;
      const windowsFile = stringPath.replace("file:///", "");
      pathArray = [windowsFile];
    }

    return path.resolve(...pathArray);
  }

  static async addToStartup(targetFile: string) {
    log.debug(`addToStartup ${targetFile}`);
    OsUtils.onlyInWindows();
    const startupDir = HomePaths.startupDir;
    await OsUtils.createShortcut(targetFile, startupDir);
  }

  static async addToDesktop(targetFile: string) {
    log.debug(`addToDesktop ${targetFile}`);
    OsUtils.onlyInWindows();
    const desktopDir = HomePaths.desktopDir;
    await OsUtils.createShortcut(targetFile, desktopDir);
  }

  static async addToStartMenu(
    targetFile: string,
    folderName: string | undefined = undefined,
  ) {
    OsUtils.onlyInWindows();
    const startMenuDir = HomePaths.startMenuDir;
    const shortcutDir = folderName ? path.resolve(startMenuDir, folderName) : startMenuDir;

    log.debug(`addToStartMenu ${targetFile}`);
    await OsUtils.createShortcut(targetFile, shortcutDir);
  }

  static removeFile(filePath: string): boolean {
    if (fs.existsSync(filePath)) {
      FileUtils.removeSync(filePath);
      return true;
    } 
    return false;
  }

  static removeDir(dirPath: string): boolean {
    if (fs.existsSync(dirPath)) {
      FileUtils.removeSync(dirPath, { recursive: true });
      return true;
    }
    return false;
  }

  static parseCmd(cmd: string): string[] {
    // FIXME: This may break on commands that have space.
    // Ideally, it should use a better cmdline parser (such as the one from shell-quote library)
    // but it may require to rewrite a few commands
    return cmd.split(' ');
  }
}
