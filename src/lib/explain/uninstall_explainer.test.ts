import * as path from "@std/path";
import { assert, assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";

import t from "../i18n.ts";
import OsUtils from "../os/os_utils.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import HomePaths from "../paths/home_paths.ts";
import TestHelper from "../test/test_helper.ts";
import { PlaybookVarResolver } from "./playbook_resolver.ts";
import {
  buildLevainFinalCleanupSteps,
  buildPackageUninstallPlan,
  findInstalledDependents,
  orderPackagesForUninstall,
} from "./uninstall_explainer.ts";

function makePkg(name: string, yamlContent: string, baseDir?: string): FileSystemPackage {
  const config = TestHelper.getConfig();
  const dir = baseDir ?? path.join(config.configPaths.levainHome, name);
  return new FileSystemPackage(config, name, dir, path.join(dir, `${name}.levain.yaml`), yamlContent);
}

Deno.test("orderPackagesForUninstall sorts dependents before dependencies, handles cycles, and places levain last", () => {
  const levain = makePkg("levain", "version: 1.1.0\n");
  const jdk = makePkg("jdk", "version: 21.0.0\n");
  const maven = makePkg("maven", "version: 3.9.0\ndependencies:\n  - jdk\n");
  const app = makePkg("my-app", "version: 1.0.0\ndependencies:\n  - maven\n");

  const ordered = orderPackagesForUninstall([jdk, levain, app, maven]);
  assertEquals(ordered.map((p) => p.name), ["my-app", "maven", "jdk", "levain"]);

  // Cycle safety
  const cycA = makePkg("cyc-a", "version: 1.0.0\ndependencies:\n  - cyc-b\n");
  const cycB = makePkg("cyc-b", "version: 1.0.0\ndependencies:\n  - cyc-a\n");
  const cycOrdered = orderPackagesForUninstall([cycA, cycB]);
  assertEquals(cycOrdered.length, 2);
});

Deno.test("findInstalledDependents detects installed packages outside the removal target", () => {
  const jdk = makePkg("jdk", "version: 21.0.0\n");
  const maven = makePkg("maven", "version: 3.9.0\ndependencies:\n  - jdk\n");
  const gradle = makePkg("gradle", "version: 8.0.0\ndependencies:\n  - jdk\n");

  const deps = findInstalledDependents([jdk, maven, gradle], new Set(["jdk"]));
  assertEquals(deps.get("jdk"), ["gradle", "maven"]);

  // When all dependents are also targeted, no warning is needed
  const noWarn = findInstalledDependents([jdk, maven, gradle], new Set(["jdk", "maven", "gradle"]));
  assertEquals(noWarn.size, 0);
});

Deno.test("buildPackageUninstallPlan translates persistent actions, ignores inside-baseDir noise, and protects secrets", () => {
  const config = TestHelper.getConfig();
  config.password = "TopSecret#99";
  const resolver = new PlaybookVarResolver(config);

  const extRoot = TestHelper.getNewTempDir();
  const baseDir = path.join(config.configPaths.levainHome, "full-app");
  const pkg = new FileSystemPackage(
    config,
    "full-app",
    baseDir,
    path.join(extRoot, "full-app.levain.yaml"),
    [
      "version: 2.0.0",
      "cmd.install:",
      "  - setVar CUSTOM_SUB custom",
      `  - mkdir ${extRoot}/extra-dir`,
      "  - mkdir ${baseDir}/inside-dir",
      `  - clone https://example.org/repo.git ${extRoot}/cloned-repo`,
      "  - copy ${pkgDir}/a.txt ${baseDir}/a.txt",
      `  - copy \${pkgDir}/b.txt ${extRoot}/ext-copy.txt`,
      `  - extract \${pkgDir}/c.zip ${extRoot}/ext-extract`,
      `  - mavenCopy org.example:lib:1.0 ${extRoot}/ext-mvn`,
      `  - template \${pkgDir}/t.tpl ${extRoot}/ext-tpl.cfg --replace A --with B`,
      `  - jsonSet ${extRoot}/settings.json [editor][font] 14`,
      "  - jsonSet ${baseDir}/internal.json [k] v",
      `  - propertySet ${extRoot}/app.properties key val`,
      `  - backupFile ${extRoot}/settings.json`,
      `  - jsonGet ${extRoot}/settings.json [editor][font] --setVar FONT_SIZE`,
      `  - propertyGet ${extRoot}/app.properties key --setVar PROP_VAL`,
      `  - checkChainDirExists ${extRoot} --saveVar FOUND_DIR`,
      `  - inspect ${extRoot}/app.properties --regExp "k=(.*)" --saveVar INSP_VAL`,
      "  - addToDesktop ${baseDir}/app.exe",
      "  - addToStartMenu ${baseDir}/app.exe MyTools",
      "  - addToStartup ${baseDir}/agent.exe",
      '  - contextMenu folders --id="keep-menu" --name="Keep Menu" --cmd="${baseDir}\\app.exe"',
      '  - contextMenu folders --id="removed-menu" --name="Temp" --cmd="${baseDir}\\tmp.exe"',
      '  - contextMenuRemove folders --id="removed-menu"',
      "  - activateInit --cmd --bash --powershell --powershell-profile=/custom/profile.ps1 --cmder --cmder-config=/cmder/cfg",
      "  - addPath --permanent ${baseDir}/bin",
      "  - setEnv --permanent APP_PERM_HOME ${baseDir}",
      "  - levainShell git config --global user.pass ${levain.password}",
      "  - levainShell --saveVar OUT_VAR echo hello",
      "  - levainShell reg import ${pkgDir}/cmd-config.reg 2>nul",
      "cmd.env:",
      "  - addPath ${baseDir}/session-only",
      "  - setEnv SESSION_ONLY 1",
    ].join("\n"),
  );

  const plan = buildPackageUninstallPlan(pkg, config, resolver, { fullCleanup: false });
  const joinedSteps = plan.steps.join("\n");
  const joinedReview = plan.manualReview.join("\n");

  // Shell activation hooks
  assertStringIncludes(joinedSteps, config.configPaths.levainHookPath);
  assertStringIncludes(joinedSteps, "/custom/profile.ps1");
  assertStringIncludes(joinedSteps, "# >>> levain initialize >>>");
  assertStringIncludes(joinedSteps, "/cmder/cfg");

  // Context menu: keep-menu included, removed-menu cancelled out
  assertStringIncludes(joinedSteps, "keep-menu");
  assertFalse(joinedSteps.includes("removed-menu"));

  // Shortcuts
  assertStringIncludes(joinedSteps, "app.exe");
  assertStringIncludes(joinedSteps, "MyTools");
  assertStringIncludes(joinedSteps, "agent.exe");

  // Permanent PATH & ENV included; session-only omitted
  assertStringIncludes(joinedSteps, path.resolve(baseDir, "bin"));
  assertStringIncludes(joinedSteps, "APP_PERM_HOME");
  assertFalse(joinedSteps.includes("session-only"));
  assertFalse(joinedSteps.includes("SESSION_ONLY"));

  // Directories: baseDir and registry file in cleanup steps; external mkdir/clone in manual review; internal subdir omitted
  assertStringIncludes(joinedSteps, baseDir);
  assertStringIncludes(joinedSteps, path.resolve(config.configPaths.levainRegistryDir, "full-app.levain.yaml"));
  assertFalse(joinedSteps.includes("inside-dir"));
  assertFalse(joinedSteps.includes(path.resolve(extRoot, "extra-dir")));
  assertFalse(joinedSteps.includes(path.resolve(extRoot, "cloned-repo")));

  // Manual review items (external dirs/clones/files, jsonSet/propertySet/backupFile outside baseDir, Win11 context menu, shell commands, cmd-config.reg)
  assertStringIncludes(joinedReview, path.resolve(extRoot, "extra-dir"));
  assertStringIncludes(joinedReview, path.resolve(extRoot, "cloned-repo"));
  assertStringIncludes(joinedReview, path.resolve(extRoot, "ext-copy.txt"));
  assertStringIncludes(joinedReview, path.resolve(extRoot, "ext-extract"));
  assertStringIncludes(joinedReview, path.resolve(extRoot, "ext-mvn"));
  assertStringIncludes(joinedReview, path.resolve(extRoot, "ext-tpl.cfg"));
  assertStringIncludes(joinedReview, "[editor][font]");
  assertFalse(joinedReview.includes("internal.json"));
  assertStringIncludes(joinedReview, "app.properties");
  assertStringIncludes(joinedReview, ".bkp");
  assertStringIncludes(joinedReview, "cmd-config.reg");
  assertStringIncludes(joinedReview, "{86ca1aa0-34aa-4e8b-a509-50c95bae2a2}");

  // Secret must NEVER leak in manual review shell commands
  assertFalse(joinedReview.includes("TopSecret#99"));
  assertStringIncludes(joinedReview, t("cmd.explain.placeholder.password"));
});

Deno.test("buildPackageUninstallPlan adapts commands for Windows and omits redundant levain dir/registry on fullCleanup", () => {
  const config = TestHelper.getConfig();
  const resolver = new PlaybookVarResolver(config);
  const pkg = makePkg(
    "win-pkg",
    [
      "version: 1.0.0",
      "cmd.install:",
      "  - activateInit",
      "  - addPath --permanent ${baseDir}/bin",
      "  - setEnv --permanent WIN_VAR value",
      "  - addToDesktop ${baseDir}/tool.exe",
    ].join("\n"),
  );
  const levainPkg = makePkg("levain", "version: 1.1.0\ncmd.install:\n  - activateInit\n");

  const isWinStub = stub(OsUtils, "isWindows", () => true);
  try {
    const plan = buildPackageUninstallPlan(pkg, config, resolver, { fullCleanup: true });
    const joined = plan.steps.join("\n");
    assertStringIncludes(joined, "Test-Path -LiteralPath");
    assertStringIncludes(joined, "Remove-Item -LiteralPath");
    assertStringIncludes(joined, "if ($k)");
    assertStringIncludes(joined, "if ($null -ne $v)");
    assertStringIncludes(joined, "tool.exe.lnk");
    assertStringIncludes(joined, "notepad $PROFILE.CurrentUserCurrentHost");
    assertStringIncludes(joined, "reg query");
    assertStringIncludes(joined, "SetEnvironmentVariable('WIN_VAR', $null, 'User')");
    assertFalse(joined.includes("win-pkg.levain.yaml"));

    // On fullCleanup, levain omits redundant remove-install-dir step (covered by Final Levain cleanup)
    const levainPlan = buildPackageUninstallPlan(levainPkg, config, resolver, { fullCleanup: true });
    assertFalse(levainPlan.steps.join("\n").includes(levainPkg.baseDir));
  } finally {
    isWinStub.restore();
  }
});

Deno.test("buildPackageUninstallPlan covers POSIX formatting, skipInstallDir, placeholders, malformed actions, and fallbacks", () => {
  const config = TestHelper.getConfig();
  const resolver = new PlaybookVarResolver(config);
  const extDir = TestHelper.getNewTempDir();

  const skipDirPkg = makePkg(
    "skip-dir-pkg",
    [
      "version: 1.0.0",
      "levain.pkg.skipInstallDir: true",
      "cmd.install:",
      '  - ""',
      "  - echo informational note",
      `  - mkdir ${extDir}/shared-dir`,
      "  - mkdir ${UNDEFINED_RUNTIME_DIR}/sub",
      `  - clone https://example.org/r.git ${extDir}/shared-dir`,
      "  - addToStartMenu ${baseDir}/tool.sh",
      '  - contextMenu folders --id="nameless-menu" --cmd="${baseDir}/run"',
      "  - activateInit --cmder --bash",
      '  - levainShell echo "hello with spaces"',
      "  - setEnv --bad-flag x y",
      "  - addPath --permanent ${UNDEFINED_PATH}",
      "  - addToDesktop ${UNDEFINED_SHORTCUT}",
    ].join("\n"),
  );

  // Explicitly test POSIX mode so POSIX branches execute on Windows CI as well
  const posixStub = stub(OsUtils, "isWindows", () => false);
  try {
    const plan = buildPackageUninstallPlan(skipDirPkg, config, resolver, { fullCleanup: false });
    const joinedSteps = plan.steps.join("\n");
    const joinedReview = plan.manualReview.join("\n");

    assertStringIncludes(joinedSteps, "rm -f '");
    assertStringIncludes(joinedSteps, "nameless-menu");
    assertStringIncludes(joinedSteps, "%CMDER_ROOT%\\config");
    assertStringIncludes(joinedSteps, "tool.sh");
    assertFalse(joinedSteps.includes("tool.sh.lnk"));
    assertStringIncludes(joinedReview, 'echo "hello with spaces"');
    assertStringIncludes(joinedReview, path.resolve(extDir, "shared-dir"));

    // Also test POSIX removeDirCommand on a regular package with baseDir
    const regularPkg = makePkg("posix-pkg", "version: 1.0.0\n");
    const regularPlan = buildPackageUninstallPlan(regularPkg, config, resolver, { fullCleanup: false });
    assertStringIncludes(regularPlan.steps.join("\n"), `rm -rf '${regularPkg.baseDir}'`);
  } finally {
    posixStub.restore();
  }

  // Fallback paths when HomePaths.homedir throws (e.g., stripped environment)
  const homeErrStub = stub(HomePaths, "homedir", () => {
    throw new Error("no home");
  });
  try {
    const planNoHome = buildPackageUninstallPlan(skipDirPkg, config, resolver, { fullCleanup: true });
    assertStringIncludes(planNoHome.steps.join("\n"), "`~/.bashrc`");
    const finalStepsNoHome = buildLevainFinalCleanupSteps(config);
    assert(finalStepsNoHome.length >= 3);
  } finally {
    homeErrStub.restore();
  }
});

Deno.test("buildLevainFinalCleanupSteps includes home, separate cache dir, config files, temp, and restart note", () => {
  const config = TestHelper.getConfig();
  const externalCache = TestHelper.getNewTempDir();
  config.configPaths.levainCacheDir = externalCache;

  const tempHome = TestHelper.getNewTempDir();
  const homeStub = stub(HomePaths, "homedir", () => tempHome);
  try {
    const steps = buildLevainFinalCleanupSteps(config);
    const joined = steps.join("\n");
    assertStringIncludes(joined, config.configPaths.levainHome);
    assertStringIncludes(joined, externalCache);
    assertStringIncludes(joined, path.resolve(tempHome, "levain.config.json"));
    assertStringIncludes(joined, path.resolve(tempHome, ".levain.yaml"));
    assertStringIncludes(joined, t("cmd.explain.uninstall.finalCleanTemp"));
    assertStringIncludes(joined, t("cmd.explain.uninstall.finalRestartShells"));

    // When cacheDir is inside levainHome, do not emit duplicate cache removal step
    config.configPaths.levainCacheDir = path.join(config.configPaths.levainHome, ".levainCache");
    const stepsNestedCache = buildLevainFinalCleanupSteps(config);
    assert(stepsNestedCache.length === steps.length - 1);
  } finally {
    homeStub.restore();
  }
});
