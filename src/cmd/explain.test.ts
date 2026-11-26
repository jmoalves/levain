import * as path from "@std/path";
import { assert, assertEquals, assertFalse, assertRejects, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";

import t from "../lib/i18n.ts";
import OsUtils from "../lib/os/os_utils.ts";
import FileSystemPackage from "../lib/package/file_system_package.ts";
import TestHelper from "../lib/test/test_helper.ts";

import CommandFactory from "./command_factory.ts";
import ExplainCommand from "./explain.ts";

async function setupConfigWithRecipes(
  recipes: Record<string, string>,
  installedRecipes: Record<string, string> = {},
) {
  const repoDir = TestHelper.getNewTempDir();
  for (const [filename, content] of Object.entries(recipes)) {
    await Deno.writeTextFile(path.join(repoDir, filename), content);
  }
  const config = TestHelper.getConfig();
  if (Object.keys(installedRecipes).length > 0) {
    const regDir = config.configPaths.levainRegistryDir;
    await Deno.mkdir(regDir, { recursive: true });
    for (const [filename, content] of Object.entries(installedRecipes)) {
      await Deno.writeTextFile(path.join(regDir, filename), content);
    }
  }
  await config.repositoryManager.init({ extraRepos: [], tempRepos: [repoDir] });
  return config;
}

Deno.test("ExplainCommand should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("explain", TestHelper.getConfig());
  assert(cmd instanceof ExplainCommand);
});

Deno.test("ExplainCommand should throw actionable error when no packages are provided and no current-dir recipe exists", async () => {
  const config = await setupConfigWithRecipes({});
  const curDirStub = stub(config.repositoryManager, "currentDirPackage", () => Promise.resolve(undefined));
  try {
    const cmd = new ExplainCommand(config);
    await assertRejects(
      async () => await cmd.execute([]),
      Error,
      t("cmd.explain.noPackages"),
    );
  } finally {
    curDirStub.restore();
  }
});

Deno.test("ExplainCommand should report missing packages with suggestions and distinguish missing transitive deps", async () => {
  const config = await setupConfigWithRecipes({
    "my-tool.levain.yaml": "version: 1.0.0\n",
    "broken-parent.levain.yaml": "version: 1.0.0\ndependencies:\n  - missing-dep\n",
  });
  const cmd = new ExplainCommand(config);
  const errorLines: string[] = [];
  const errStub = stub(console, "error", (...args: unknown[]) => {
    errorLines.push(args.map(String).join(" "));
  });

  try {
    await assertRejects(
      async () => await cmd.execute(["my-tol"]),
      Error,
      t("cmd.explain.errorNotFound", { pkgNames: "my-tol" }),
    );
    assert(errorLines.some((line) => line.includes("my-tool")));

    // Completely unrelated name should NOT print an empty "Similar known packages" block
    errorLines.length = 0;
    await assertRejects(
      async () => await cmd.execute(["zzzz-completely-unknown-999"]),
      Error,
      t("cmd.explain.errorNotFound", { pkgNames: "zzzz-completely-unknown-999" }),
    );
    assertFalse(errorLines.some((line) => line.includes(t("cmd.install.similar"))));

    // Transitive missing dependency reports dependency resolution error
    errorLines.length = 0;
    await assertRejects(
      async () => await cmd.execute(["broken-parent"]),
      Error,
      t("cmd.explain.errorMissingDep", { pkgNames: "broken-parent" }),
    );
    assert(errorLines.some((line) => line.includes("broken-parent")));
  } finally {
    errStub.restore();
  }
});

Deno.test("ExplainCommand should render a human-readable Markdown playbook to stdout and omit implicit levain", async () => {
  const otherOs = OsUtils.isWindows() ? "linux" : "windows";
  const config = await setupConfigWithRecipes(
    {
      "dep-pkg.levain.yaml": [
        "version: 1.0.0",
        "cmd.install:",
        "  - echo installing dep",
      ].join("\n"),
      "meta-pkg.levain.yaml": [
        "levain.pkg.skipInstallDir: true",
        "dependencies:",
        "  - dep-pkg",
      ].join("\n"),
      "other-os-pkg.levain.yaml": [
        "version: 1.0.0",
        `cmd.install.${otherOs}:`,
        "  - echo only on another os",
      ].join("\n"),
      "app-pkg.levain.yaml": [
        "version: 2.0.0",
        "dependencies:",
        "  - meta-pkg",
        "  - other-os-pkg",
        "cmd.install:",
        "  - mkdir ${baseDir}/bin",
        "  - copy https://example.org/app-${version}.zip ${baseDir}",
        "cmd.shell:",
        "  - echo entering app shell",
        "cmd.env:",
        "  - setEnv APP_HOME ${baseDir}",
        "  - addPath ${baseDir}/bin",
      ].join("\n"),
    },
    {
      "dep-pkg.levain.yaml": [
        "version: 1.0.0",
        "cmd.install:",
        "  - echo installing dep",
      ].join("\n"),
      "app-pkg.levain.yaml": "version: 1.0.0\n",
    },
  );

  const cmd = new ExplainCommand(config);
  const printed: string[] = [];
  const logStub = stub(console, "log", (...args: unknown[]) => {
    printed.push(args.map(String).join(" "));
  });

  try {
    await cmd.execute(["app-pkg"]);
  } finally {
    logStub.restore();
  }

  const depPkg = config.packageManager.package("dep-pkg")!;
  const appPkg = config.packageManager.package("app-pkg")!;

  assertEquals(printed.length, 1);
  const md = printed[0];

  // Title, subtitle, bulleted dependency order, base dir
  assertStringIncludes(md, `# ${t("cmd.explain.title", { packages: "app-pkg" })}`);
  assertStringIncludes(md, t("cmd.explain.subtitle"));
  assertStringIncludes(
    md,
    `- ${t("cmd.explain.order", { order: "1. dep-pkg@1.0.0 → 2. meta-pkg → 3. other-os-pkg@1.0.0 → 4. app-pkg@2.0.0" })}`,
  );
  assertStringIncludes(md, `- ${t("cmd.explain.baseDir", { dir: config.configPaths.levainHome })}`);

  // Implicit levain dependency is omitted when not explicitly requested
  assertFalse(md.includes("## 1. levain"));

  // Status badges across all 3 states + meta-package noSteps + other-OS-only message
  assertStringIncludes(md, `[${t("cmd.explain.statusInstalled")}]`);
  assertStringIncludes(md, `[${t("cmd.explain.statusNotInstalled")}]`);
  assertStringIncludes(md, `[${t("cmd.explain.statusUpdateAvailable")}]`);
  assertStringIncludes(md, t("cmd.explain.noSteps"));
  assertStringIncludes(md, t("cmd.explain.otherOsOnly", { os: OsUtils.getOs(), platforms: otherOs }));

  // dep-pkg auto-prepends mkdir ${baseDir}; app-pkg already starts with mkdir so does not prepend a duplicate
  assertStringIncludes(md, t("cmd.explain.step.mkdir", { dir: depPkg.baseDir }));
  assertStringIncludes(md, t("cmd.explain.step.echo", { message: "installing dep" }));
  assertStringIncludes(md, t("cmd.explain.step.mkdir", { dir: path.resolve(appPkg.baseDir, "bin") }));
  assertStringIncludes(md, "https://example.org/app-2.0.0.zip");
  assertStringIncludes(md, t("cmd.explain.step.echo", { message: "entering app shell" }));
  assertStringIncludes(md, t("cmd.explain.step.setEnv", { key: "APP_HOME", value: appPkg.baseDir }));
  assertStringIncludes(md, t("cmd.explain.step.addPath", { dir: path.resolve(appPkg.baseDir, "bin") }));
});

Deno.test("ExplainCommand should include levain when explicitly requested and support --raw mode", async () => {
  const config = await setupConfigWithRecipes({
    "simple.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - echo raw ${baseDir}",
    ].join("\n"),
  });
  const cmd = new ExplainCommand(config);

  const rawMd = await cmd.render(["--raw", "simple"]);
  assertStringIncludes(rawMd, `# ${t("cmd.explain.rawTitle", { packages: "simple" })}`);
  assertStringIncludes(rawMd, "1. `echo raw ${baseDir}`");
  assertFalse(rawMd.includes("mkdir ${baseDir}"));

  const levainMd = await cmd.render(["levain"]);
  assertStringIncludes(levainMd, "1. levain@");
});

Deno.test("ExplainCommand should support current-dir .levain.yaml with dependencies and with project-only actions", async () => {
  const config = await setupConfigWithRecipes({
    "dep-pkg.levain.yaml": "version: 1.0.0\ncmd.install:\n  - echo dep\n",
  });
  const projectDir = TestHelper.getNewTempDir();
  const projectPkg = new FileSystemPackage(
    config,
    "my-project",
    projectDir,
    path.join(projectDir, ".levain.yaml"),
    [
      "dependencies:",
      "  - dep-pkg",
      "cmd.shell:",
      "  - echo entering project",
      "cmd.env:",
      "  - setEnv PROJECT_ENV dev",
    ].join("\n"),
  );
  const curDirStub = stub(config.repositoryManager, "currentDirPackage", () => Promise.resolve(projectPkg));

  try {
    const cmd = new ExplainCommand(config);
    const md = await cmd.render([]);

    assertStringIncludes(md, "1. dep-pkg@1.0.0");
    assertFalse(md.includes("levain@"));
    assertStringIncludes(md, `## ${t("cmd.explain.sectionProject", { name: "my-project" })}`);
    assertStringIncludes(md, t("cmd.explain.step.echo", { message: "entering project" }));
    assertStringIncludes(md, t("cmd.explain.step.setEnv", { key: "PROJECT_ENV", value: "dev" }));
  } finally {
    curDirStub.restore();
  }

  // Project-only .levain.yaml (no dependencies, only cmd.env)
  const envOnlyPkg = new FileSystemPackage(
    config,
    "env-only-project",
    projectDir,
    path.join(projectDir, ".levain.yaml"),
    "cmd.env:\n  - setEnv ONLY_ENV yes\n",
  );
  const envOnlyStub = stub(config.repositoryManager, "currentDirPackage", () => Promise.resolve(envOnlyPkg));

  try {
    const cmd = new ExplainCommand(config);
    const md = await cmd.render([]);

    assertStringIncludes(md, `# ${t("cmd.explain.title", { packages: "env-only-project" })}`);
    assertStringIncludes(md, `## ${t("cmd.explain.sectionProject", { name: "env-only-project" })}`);
    assertStringIncludes(md, t("cmd.explain.step.setEnv", { key: "ONLY_ENV", value: "yes" }));
  } finally {
    envOnlyStub.restore();
  }
});

Deno.test("ExplainCommand --uninstall validates conflicts, empty registry, and unknown packages", async () => {
  const config = await setupConfigWithRecipes({
    "my-tool.levain.yaml": "version: 1.0.0\n",
  });
  const cmd = new ExplainCommand(config);

  await assertRejects(
    () => cmd.render(["--raw", "--uninstall", "my-tool"]),
    Error,
    t("cmd.explain.uninstall.rawConflict"),
  );

  await assertRejects(
    () => cmd.render(["--uninstall"]),
    Error,
    t("cmd.explain.uninstall.noInstalled"),
  );

  const errLines: string[] = [];
  const errStub = stub(console, "error", (...args: unknown[]) => errLines.push(args.map(String).join(" ")));
  try {
    await assertRejects(
      () => cmd.render(["--uninstall", "my-tol"]),
      Error,
      t("cmd.explain.errorNotFound", { pkgNames: "my-tol" }),
    );
    assert(errLines.some((line) => line.includes("my-tool")));
  } finally {
    errStub.restore();
  }
});

Deno.test("ExplainCommand --uninstall generates full cleanup guide in reverse dependency order with levain last", async () => {
  const config = await setupConfigWithRecipes(
    {},
    {
      "levain.levain.yaml": [
        "version: 1.1.0",
        "cmd.install:",
        "  - activateInit",
        "  - addPath --permanent ${baseDir}",
      ].join("\n"),
      "jdk.levain.yaml": [
        "version: 21.0.0",
        "cmd.install:",
        "  - setEnv --permanent JAVA_HOME ${baseDir}",
      ].join("\n"),
      "maven.levain.yaml": [
        "version: 3.9.0",
        "dependencies:",
        "  - jdk",
        "cmd.install:",
        "  - addPath --permanent ${baseDir}/bin",
      ].join("\n"),
      "ctx-menu.levain.yaml": [
        "version: 1.0.0",
        "levain.pkg.skipInstallDir: true",
        "cmd.install:",
        '  - contextMenu folders --id="levain-shell" --name="Levain Shell" --cmd="${pkg.levain.baseDir}\\levain shell"',
      ].join("\n"),
    },
  );

  const cmd = new ExplainCommand(config);
  const md = await cmd.render(["--uninstall"]);

  assertStringIncludes(md, `# ${t("cmd.explain.uninstall.titleAll")}`);
  // Reverse dependency order: maven before jdk, levain last
  const mavenIdx = md.indexOf("maven@3.9.0");
  const jdkIdx = md.indexOf("jdk@21.0.0");
  const levainIdx = md.indexOf("levain@1.1.0");
  assert(mavenIdx > 0 && jdkIdx > mavenIdx && levainIdx > jdkIdx, `unexpected order in:\n${md}`);

  // Context menu, permanent PATH, permanent env, and Final Levain cleanup section included
  assertStringIncludes(md, "levain-shell");
  assertStringIncludes(md, "JAVA_HOME");
  assertStringIncludes(md, `## ${t("cmd.explain.uninstall.sectionFinalCleanup")}`);
  // Partial registry entry step should NOT appear during full cleanup
  assertFalse(md.includes("maven.levain.yaml`:"));
});

Deno.test("ExplainCommand --uninstall for specific package warns about installed dependents and supports meta/other-OS packages", async () => {
  const otherOs = OsUtils.isWindows() ? "linux" : "windows";
  const config = await setupConfigWithRecipes(
    {
      "meta-only.levain.yaml": "levain.pkg.skipInstallDir: true\nlevain.pkg.skipRegistry: true\n",
      "other-os.levain.yaml": `levain.pkg.skipInstallDir: true\nlevain.pkg.skipRegistry: true\ncmd.install.${otherOs}:\n  - echo hi\n`,
    },
    {
      "jdk.levain.yaml": "version: 21.0.0\ncmd.install:\n  - setEnv --permanent JAVA_HOME ${baseDir}\n",
      "maven.levain.yaml": "version: 3.9.0\ndependencies:\n  - jdk\n",
    },
  );

  const cmd = new ExplainCommand(config);
  const md = await cmd.render(["--uninstall", "jdk.levain.yaml", "jdk"]);

  assertStringIncludes(md, `# ${t("cmd.explain.uninstall.title", { packages: "jdk" })}`);
  assertStringIncludes(md, t("cmd.explain.uninstall.dependentWarning", { pkg: "jdk", dependents: "`maven`" }));
  assertStringIncludes(md, `[${t("cmd.explain.uninstall.statusInstalled")}]`);
  assertStringIncludes(md, "JAVA_HOME");
  assertStringIncludes(md, path.resolve(config.configPaths.levainRegistryDir, "jdk.levain.yaml"));
  assertFalse(md.includes(`## ${t("cmd.explain.uninstall.sectionFinalCleanup")}`));

  // Explicitly uninstalling levain while other packages remain installed warns clearly and includes final cleanup
  const levainMd = await cmd.render(["--uninstall", "levain"]);
  assertStringIncludes(
    levainMd,
    t("cmd.explain.uninstall.levainFullRemovalWarning", { packages: "`jdk`, `maven`" }),
  );
  assertStringIncludes(levainMd, `## ${t("cmd.explain.uninstall.sectionFinalCleanup")}`);

  // Windows shell note appears when running on Windows
  const isWinStub = stub(OsUtils, "isWindows", () => true);
  try {
    const winMd = await cmd.render(["--uninstall", "jdk"]);
    assertStringIncludes(winMd, t("cmd.explain.uninstall.windowsShellNote"));
  } finally {
    isWinStub.restore();
  }

  // Meta-package and other-OS-only package messages
  const metaMd = await cmd.render(["--uninstall", "meta-only", "other-os"]);
  assertStringIncludes(metaMd, t("cmd.explain.uninstall.noSteps"));
  assertStringIncludes(metaMd, t("cmd.explain.otherOsOnly", { os: OsUtils.getOs(), platforms: otherOs }));
});
