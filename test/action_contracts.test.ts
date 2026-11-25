import * as path from "@std/path";
import * as yaml from "@std/yaml";
import { existsSync } from "@std/fs";
import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";

import ActionFactory from "../src/action/action_factory.ts";
import Shell from "../src/cmd/shell.ts";
import BashInitializer from "../src/lib/activate/bash_initializer.ts";
import CmdInitializer from "../src/lib/activate/cmd_initializer.ts";
import CmderInitializer from "../src/lib/activate/cmder_initializer.ts";
import PowershellInitializer from "../src/lib/activate/powershell_initializer.ts";
import Loader from "../src/lib/loader.ts";
import { OsShell } from "../src/lib/os/os_shell.ts";
import OsUtils from "../src/lib/os/os_utils.ts";
import PackageManager from "../src/lib/package/package_manager.ts";
import GeneralPaths from "../src/lib/paths/general_paths.ts";
import LevainPaths from "../src/lib/paths/levain_paths.ts";
import RepositoryFactory from "../src/lib/repository/repository_factory.ts";
import TestHelper from "../src/lib/test/test_helper.ts";

const contractsDir = path.resolve(LevainPaths.levainSrcDir, "testdata", "contracts");

interface ActionOptionSpec {
  actionName: string;
  filePath: string;
  options: Set<string>;
}

/**
 * Inspects ActionFactory and every implementing action source file to discover
 * all registered actions and every option declared in their parseArgs() calls.
 */
function discoverActionOptionSpecs(): ActionOptionSpec[] {
  const factoryPath = path.resolve(LevainPaths.levainSrcDir, "src", "action", "action_factory.ts");
  const factorySrc = Deno.readTextFileSync(factoryPath);

  const importMap = new Map<string, string>();
  for (const match of factorySrc.matchAll(/import\s+(\w+)\s+from\s+"([^"]+)";/g)) {
    const [, className, relPath] = match;
    importMap.set(className, path.resolve(path.dirname(factoryPath), relPath));
  }

  const specs: ActionOptionSpec[] = [];
  const entryRegex = /\[\s*"([^"]+)"\s*,\s*\([^)]*\)\s*=>\s*new\s+(\w+)\s*\(/g;
  for (const match of factorySrc.matchAll(entryRegex)) {
    const [, actionName, className] = match;
    const filePath = importMap.get(className);
    assert(filePath, `Could not resolve source file for action ${actionName} (${className})`);

    const actionSrc = Deno.readTextFileSync(filePath);
    const options = new Set<string>();
    const parseArgsMatch = actionSrc.match(/parseArgs\s*\(\s*\w+\s*,\s*\{([\s\S]*?)\}\s*\)/);
    if (parseArgsMatch) {
      const optionsBlock = parseArgsMatch[1];
      for (const arrayMatch of optionsBlock.matchAll(/(?:boolean|stringOnce|stringMany)\s*:\s*\[([\s\S]*?)\]/g)) {
        for (const strMatch of arrayMatch[1].matchAll(/"([^"]+)"|'([^']+)'/g)) {
          options.add(strMatch[1] || strMatch[2]);
        }
      }
    }

    specs.push({ actionName, filePath, options });
  }

  return specs;
}

/**
 * Parses all synthetic contract recipes in testdata/contracts/*.levain.yaml and
 * returns a map of actionName -> Set of exercised --option names.
 */
function collectContractCoverage(): Map<string, Set<string>> {
  const covered = new Map<string, Set<string>>();

  for (const entry of Deno.readDirSync(contractsDir)) {
    if (!entry.isFile || !entry.name.endsWith(".levain.yaml")) {
      continue;
    }

    const content = Deno.readTextFileSync(path.join(contractsDir, entry.name));
    const doc = yaml.parse(content) as Record<string, unknown>;

    for (const section of ["cmd.install", "cmd.env", "cmd.shell"]) {
      const lines = doc?.[section];
      if (!Array.isArray(lines)) {
        continue;
      }

      for (const line of lines) {
        if (typeof line !== "string") {
          continue;
        }
        const tokens = line.trim().split(/\s+/);
        const actionName = tokens.shift();
        if (!actionName) {
          continue;
        }

        if (!covered.has(actionName)) {
          covered.set(actionName, new Set<string>());
        }
        const optSet = covered.get(actionName)!;

        for (const token of tokens) {
          if (token.startsWith("--") && token.length > 2) {
            const flagName = token.slice(2).split("=")[0];
            optSet.add(flagName);
          }
        }
      }
    }
  }

  return covered;
}

Deno.test("Contract guard: 100% of registered actions and 100% of their parseArgs options must be covered", () => {
  const registeredActions = new ActionFactory().list();
  const specs = discoverActionOptionSpecs();
  const covered = collectContractCoverage();

  // Verify parser found every action in ActionFactory
  assertEquals(
    specs.map((s) => s.actionName).sort(),
    [...registeredActions].sort(),
    "Contract discovery must inspect every action registered in ActionFactory",
  );

  const missingActions: string[] = [];
  const missingOptions: string[] = [];

  for (const spec of specs) {
    const exercised = covered.get(spec.actionName);
    if (!exercised) {
      missingActions.push(spec.actionName);
      continue;
    }
    for (const opt of spec.options) {
      if (!exercised.has(opt)) {
        missingOptions.push(`${spec.actionName} --${opt}`);
      }
    }
  }

  assertEquals(
    missingActions,
    [],
    `Actions missing from testdata/contracts/*.levain.yaml: ${missingActions.join(", ")}`,
  );
  assertEquals(
    missingOptions,
    [],
    `Action options missing from testdata/contracts/*.levain.yaml: ${missingOptions.join(", ")}`,
  );
});

Deno.test("Contract recipe: contract-fs-and-data executes all cross-platform actions end-to-end", async () => {
  RepositoryFactory.knownRepos.clear();
  const config = TestHelper.getConfig();
  await config.repositoryManager.init({ extraRepos: [], tempRepos: [contractsDir] });

  const resolved = config.packageManager.resolvePackages(["contract-fs-and-data"], false, false);
  assert(resolved, "contract-fs-and-data should resolve cleanly");
  const pkg = config.packageManager.package("contract-fs-and-data");
  assert(pkg, "contract-fs-and-data recipe should resolve from contracts repo");

  // Seed offline dependencies for clone, shellPath, removeFromRegistry, and checkUrl
  const bareGitRepo = await TestHelper.createLocalGitRepo({ "hello.txt": "from-contract-git\n" });
  const fakeShellFile = TestHelper.getNewTempFile();
  config.setVar("CONTRACT_GIT_REPO", bareGitRepo);
  config.setVar("CONTRACT_SHELL_FILE", fakeShellFile);

  await Deno.mkdir(config.configPaths.levainRegistryDir, { recursive: true });
  const dummyRegFile = path.join(config.configPaths.levainRegistryDir, "contract-dummy-installed.levain.yaml");
  await Deno.writeTextFile(dummyRegFile, "version: 0.0.1\n");
  await config.levainRegistry.init();

  const fetchStub = stub(globalThis, "fetch", () => Promise.resolve(new Response("ok", { status: 200 })));

  try {
    const loader = new Loader(config);
    const installActions: string[] = pkg.yamlItem("cmd.install") || [];
    const envActions: string[] = pkg.yamlItem("cmd.env") || [];

    for (const actionLine of [...installActions, ...envActions]) {
      await loader.action(pkg, actionLine);
    }

    // Verify filesystem & state side effects
    assert(existsSync(path.join(pkg.baseDir, "work", "copied.txt")));
    assert(existsSync(path.join(pkg.baseDir, "work", "copied-verbose.txt")));
    assert(existsSync(path.join(pkg.baseDir, "stripped-copy", "inside.txt")));
    assert(existsSync(path.join(pkg.baseDir, "compacted")));
    assert(existsSync(path.join(pkg.baseDir, "extracted", "test", "hello.txt")));
    assert(existsSync(path.join(pkg.baseDir, "extracted-stripped", "hello.txt")));
    assert(existsSync(path.join(pkg.baseDir, "cloned", "hello.txt")));
    assertEquals(existsSync(dummyRegFile), false, "removeFromRegistry should delete dummy recipe");

    const rendered = (await Deno.readTextFile(path.join(pkg.baseDir, "work", "rendered.txt"))).replaceAll("\r\n", "\n");
    assertEquals(rendered, "greeting=hello contract\npath=C:\\\\tools\\\\app\n");

    assertEquals(config.getVar("CONTRACT_VER"), "4.2.0");
    assertEquals(config.getVar("CONTRACT_STATUS"), "STATUS_OK");
    assertEquals(config.getVar("CONTRACT_JSON_NAME"), "levain-contract");
    assertEquals(config.getVar("CONTRACT_JSON_FALLBACK"), "fallback-json");
    assertEquals(config.getVar("CONTRACT_PROP_HOST"), "localhost");
    assertEquals(config.getVar("CONTRACT_CUSTOM_VAR"), "custom-value");
    assertEquals(config.getVar("CONTRACT_NODE_OPTS"), "--max_old_space_size=4096");
    assertEquals(path.resolve(config.getVar("CONTRACT_FOUND_DIR") ?? ""), path.resolve(pkg.baseDir, "work"));
    assertEquals(config.getVar("CONTRACT_DEFAULT_DIR"), "fallback-dir");
    assertEquals(config.getVar("CONTRACT_FS_READY"), "true");
    assertEquals(config.defaultPackage, "contract-fs-and-data");
    assertEquals(config.shellPath, fakeShellFile);
    assert(
      (config.context.action.addpath.path as string[]).includes(path.resolve(pkg.baseDir, "work")),
      "addPath should append resolved directory to shell PATH context",
    );
  } finally {
    fetchStub.restore();
  }
});

Deno.test("Contract recipe: contract-os-and-shell executes all OS, shell, activate, and maven actions", async () => {
  RepositoryFactory.knownRepos.clear();
  const config = TestHelper.getConfig();
  await config.repositoryManager.init({ extraRepos: [], tempRepos: [contractsDir] });

  // Resolve levain + contract-os-and-shell so ${pkg.levain.recipesDir} works for contextMenu templates
  const resolved = config.packageManager.resolvePackages(["contract-os-and-shell"], false, false);
  assert(resolved, "contract-os-and-shell should resolve cleanly");
  const pkg = config.packageManager.package("contract-os-and-shell");
  assert(pkg, "contract-os-and-shell should be in packageManager");

  // Copy real .reg templates into ${pkg.levain.recipesDir} so contextMenu runs template end-to-end
  const levainPkg = config.packageManager.package("levain");
  assert(levainPkg);
  const recipesDir = await config.packageManager.getVar("levain", "recipesDir");
  assert(recipesDir);
  await Deno.mkdir(recipesDir, { recursive: true });
  await Deno.copyFile(
    path.join(LevainPaths.levainRecipesDir, "levain-shell.reg"),
    path.join(recipesDir, "levain-shell.reg"),
  );
  await Deno.copyFile(
    path.join(LevainPaths.levainRecipesDir, "levain-shell-remove.reg"),
    path.join(recipesDir, "levain-shell-remove.reg"),
  );

  const createdTempFiles: string[] = [];
  const osShellCalls: Array<{
    args: string[];
    saveVar?: string;
    stripCRLF: boolean;
    ignoreErrors: boolean;
  }> = [];
  const runAndLogCalls: string[][] = [];
  const origLog = console.log;

  const addPathPermStub = stub(OsUtils, "addPathPermanent", () => Promise.resolve(""));
  const setEnvPermStub = stub(OsUtils, "setEnvPermanent", () => Promise.resolve());
  const desktopStub = stub(OsUtils, "addToDesktop", () => Promise.resolve());
  const startMenuStub = stub(OsUtils, "addToStartMenu", () => Promise.resolve());
  const startupStub = stub(OsUtils, "addToStartup", () => Promise.resolve());
  const onlyWinStub = stub(OsUtils, "onlyInWindows", () => {});
  const runAndLogStub = stub(OsUtils, "runAndLog", (cmd: string | string[]) => {
    const argv = Array.isArray(cmd) ? cmd : [cmd];
    runAndLogCalls.push(argv);
    if (argv[0] === "reg" && argv[1] === "import" && argv[2]) {
      createdTempFiles.push(argv[2]);
    }
    return Promise.resolve("");
  });
  const mvnCliStub = stub(GeneralPaths, "mvnCliPath", () => "/mock/mvn");
  const osShellExecStub = stub(OsShell.prototype, "execute", function (this: OsShell, args: string[]) {
    osShellCalls.push({
      args,
      saveVar: this.saveVar,
      stripCRLF: this.stripCRLF,
      ignoreErrors: this.ignoreErrors,
    });
    return Promise.resolve();
  });
  const osShellPrepEnvStub = stub(OsShell.prototype, "prepareEnv", (env: Record<string, string>) => {
    env.LEVAIN_CURRENT = "contract-os-and-shell";
    return Promise.resolve();
  });
  const cmdInitStub = stub(CmdInitializer.prototype, "install", () => Promise.resolve());
  const bashInitStub = stub(BashInitializer.prototype, "install", () => Promise.resolve());
  const psInitStub = stub(PowershellInitializer.prototype, "install", () => Promise.resolve());
  const cmderInitStub = stub(CmderInitializer.prototype, "install", () => Promise.resolve());
  const shellReadStub = stub(Shell.prototype, "readPackages", (args: string[]) =>
    Promise.resolve({ pkgNames: args, pkgActions: undefined, curDirPkg: undefined })
  );
  const shellInstallStub = stub(Shell.prototype, "installPackages", () => Promise.resolve());
  const shellRunStub = stub(Shell.prototype, "runShell", () => Promise.resolve());
  const resolveStub = stub(PackageManager.prototype, "resolvePackages", () => [pkg]);

  // Seed settings.json so jsonRemove executes end-to-end
  const settingsFile = path.join(pkg.baseDir, "settings.json");
  await Deno.mkdir(pkg.baseDir, { recursive: true });
  await Deno.writeTextFile(settingsFile, JSON.stringify({ obsoleteKey: "old", keep: "yes" }));

  try {
    console.log = () => {};
    const loader = new Loader(config);
    const installActions: string[] = pkg.yamlItem("cmd.install") || [];

    for (const actionLine of installActions) {
      await loader.action(pkg, actionLine);
    }

    assertEquals(addPathPermStub.calls.length, 1);
    assertEquals(setEnvPermStub.calls.length, 1);
    assertEquals(desktopStub.calls.length, 1);
    assertEquals(startMenuStub.calls.length, 1);
    assertEquals(startupStub.calls.length, 1);
    assertEquals(cmdInitStub.calls.length, 1);
    assertEquals(bashInitStub.calls.length, 1);
    assertEquals(psInitStub.calls.length, 1);
    assertEquals(cmderInitStub.calls.length, 1);
    assertEquals(shellInstallStub.calls.length, 1);

    // Verify killProcess and mavenCopy invoked OsUtils.runAndLog
    assert(runAndLogCalls.some((cmd) => cmd.includes("taskkill") && cmd.includes("demo-contract.exe")));
    assert(runAndLogCalls.some((cmd) => cmd.includes("dependency:copy") && cmd.includes("-Dartifact=com.example:demo-artifact:1.0.0:jar")));

    // Verify jsonRemove removed obsoleteKey and kept other keys
    assertEquals(JSON.parse(await Deno.readTextFile(settingsFile)), { keep: "yes" });

    // Verify contextMenu, contextMenuRemove, and direct levainShell calls reached OsShell and cleaned up temp files
    assertEquals(createdTempFiles.length, 2, "contextMenu and contextMenuRemove should each render a .reg temp file");
    for (const tempRegFile of createdTempFiles) {
      assertEquals(existsSync(tempRegFile), false, `contextMenu temp file should be cleaned up: ${tempRegFile}`);
    }
    const directShellCall = osShellCalls.find((c) => c.saveVar === "CONTRACT_SHELL_OUT");
    assert(directShellCall, "direct levainShell contract call should propagate --saveVar");
    assertEquals(directShellCall.stripCRLF, true);
    assertEquals(directShellCall.ignoreErrors, true);
    assertEquals(directShellCall.args, ["echo", "contract", "&&", "echo", "done"]);
  } finally {
    console.log = origLog;
    resolveStub.restore();
    shellRunStub.restore();
    shellInstallStub.restore();
    shellReadStub.restore();
    cmderInitStub.restore();
    psInitStub.restore();
    bashInitStub.restore();
    cmdInitStub.restore();
    osShellPrepEnvStub.restore();
    osShellExecStub.restore();
    mvnCliStub.restore();
    runAndLogStub.restore();
    onlyWinStub.restore();
    startupStub.restore();
    startMenuStub.restore();
    desktopStub.restore();
    setEnvPermStub.restore();
    addPathPermStub.restore();
  }
});

Deno.test("Contract recipe: contract-yaml-patterns covers folded YAML strings, metadata keys, cross-pkg vars, and secrets", async () => {
  RepositoryFactory.knownRepos.clear();
  const config = TestHelper.getConfig();
  config.login = "demo-user";
  config.email = "demo@example.org";
  config.fullname = "Demo User";
  config.password = "s3cr3t${HOME}value";

  await config.repositoryManager.init({ extraRepos: [], tempRepos: [contractsDir] });
  const resolved = config.packageManager.resolvePackages(["contract-yaml-patterns"], false, false);
  assert(resolved, "contract-yaml-patterns should resolve with contract-dep");

  const pkg = config.packageManager.package("contract-yaml-patterns");
  const depPkg = config.packageManager.package("contract-dep");
  assert(pkg && depPkg);

  // Verify engine YAML metadata flags
  assertEquals(pkg.skipInstallDir(), true);
  assertEquals(pkg.skipRegistry(), true);
  assertEquals(pkg.yamlItem("levain.preserveBaseDirOnUpdate"), true);
  assertEquals(pkg.yamlItem("levain.config.noBaseDir"), true);
  assertEquals(pkg.yamlItem("levain.var.default.sampleKey"), "default-sample");

  // Execute cmd.install (including YAML `- >-` folded multiline action) & cmd.env
  const loader = new Loader(config);
  for (const line of [...(pkg.yamlItem("cmd.install") || []), ...(pkg.yamlItem("cmd.env") || [])]) {
    await loader.action(pkg, line);
  }

  assertEquals(config.getVar("CONTRACT_DEP_BASE"), depPkg.baseDir);
  assertEquals(
    config.getVar("CONTRACT_SECRET_ECHO"),
    "s3cr3t${HOME}value",
    "levain.password must not be re-expanded by VarResolver",
  );
  assertEquals(
    config.getVar("CONTRACT_SECRET_URL"),
    "https://demo-user:s3cr3t%24%7BHOME%7Dvalue@proxy.example.org",
    "urlEncode filter should RFC 3986 encode password without re-expanding ${...}",
  );
  assertEquals(config.getVar("CONTRACT_FLAG_VAL"), "--flag-value=123");
  assertEquals(config.getVar("CONTRACT_YAML_PATTERNS"), "ok");

  // Verify cmd.shell + cmd.env combination via Shell.readPackages
  const curDirStub = stub(config.repositoryManager, "currentDirPackage", () => Promise.resolve(pkg));
  try {
    const shell = new Shell(config);
    const { pkgActions } = await shell.readPackages([]);
    assertEquals(pkgActions, ["echo contract-shell-hook", "setEnv CONTRACT_YAML_PATTERNS ok"]);
  } finally {
    curDirStub.restore();
  }
});
