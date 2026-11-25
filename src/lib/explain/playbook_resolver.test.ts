import * as path from "@std/path";
import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";

import t from "../i18n.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import HomePaths from "../paths/home_paths.ts";
import TestHelper from "../test/test_helper.ts";
import { PlaybookVarResolver } from "./playbook_resolver.ts";

function makePkg(name: string, yamlStr: string) {
  const config = TestHelper.getConfig();
  const baseDir = path.join(config.configPaths.levainHome, name);
  const pkgDir = path.join(config.configPaths.levainHome, "recipes");
  return {
    config,
    pkg: new FileSystemPackage(config, name, baseDir, path.join(pkgDir, `${name}.levain.yaml`), yamlStr),
  };
}

Deno.test("PlaybookVarResolver should resolve package attributes, YAML custom vars, and cross-package refs", () => {
  const { config, pkg: depPkg } = makePkg(
    "dep-tool",
    [
      "version: 1.2.3",
      'downloadUrl: "https://example.org/${name}-${version}.zip"',
    ].join("\n"),
  );
  const appBase = path.join(config.configPaths.levainHome, "app-tool");
  const appFile = path.join(config.configPaths.levainHome, "recipes", "app-tool.levain.yaml");
  const appPkg = new FileSystemPackage(
    config,
    "app-tool",
    appBase,
    appFile,
    [
      "version: 2.0.0",
      'archive: "${name}-${version}.tar.gz"',
      'depBase: "${pkg.dep-tool.baseDir}"',
      'depUrl: "${pkg.dep-tool.downloadUrl}"',
      "config:",
      '  mirrorUrl: "https://mirror.example.org/${name}"',
    ].join("\n"),
  );

  const pkgStub = stub(config.packageManager, "package", (name: string) => {
    if (name === "dep-tool") return depPkg;
    if (name === "app-tool") return appPkg;
    return undefined;
  });

  try {
    const resolver = new PlaybookVarResolver(config);

    assertEquals(resolver.resolve("plain text without vars", appPkg), "plain text without vars");
    assertEquals(resolver.resolve("unclosed ${var", appPkg), "unclosed ${var");
    assertEquals(resolver.resolve("${baseDir}/bin", appPkg), `${appPkg.baseDir}/bin`);
    assertEquals(resolver.resolve("${pkgDir}/file.txt", appPkg), `${appPkg.pkgDir}/file.txt`);
    assertEquals(resolver.resolve("${name}@${version}", appPkg), "app-tool@2.0.0");
    assertEquals(resolver.resolve("${archive}", appPkg), "app-tool-2.0.0.tar.gz");
    assertEquals(resolver.resolve("${depBase}", appPkg), depPkg.baseDir);
    assertEquals(resolver.resolve("${depUrl}", appPkg), "https://example.org/dep-tool-1.2.3.zip");
    assertEquals(resolver.resolve("${mirrorUrl}", appPkg), "https://mirror.example.org/app-tool");
    assertEquals(
      resolver.resolve("${pkg.missing.baseDir}", appPkg),
      t("cmd.explain.placeholder.runtimeVar", { name: "pkg.missing.baseDir" }),
    );
  } finally {
    pkgStub.restore();
  }
});

Deno.test("PlaybookVarResolver should resolve home, levain paths, config vars, env vars, defaults, scoped and runtime vars", () => {
  const config = TestHelper.getConfig();
  config.setVar("cfgVar", "from-config");
  config.setVar("levain.var.default.defaultedVar", "from-default");
  Deno.env.set("LEVAIN_PLAYBOOK_TEST_ENV", "from-env");

  try {
    const resolver = new PlaybookVarResolver(config);

    assertEquals(resolver.resolve("${home}"), HomePaths.homedir());
    assertEquals(resolver.resolve("${levainHome}"), config.configPaths.levainHome);
    assertEquals(resolver.resolve("${levain.homeDir}"), config.configPaths.levainHome);
    assertEquals(resolver.resolve("${levain.cacheDir}"), config.configPaths.levainCacheDir);
    assertEquals(
      resolver.resolve("${levain.unknownKey}"),
      t("cmd.explain.placeholder.runtimeVar", { name: "levain.unknownKey" }),
    );
    assertEquals(resolver.resolve("${cfgVar}"), "from-config");
    assertEquals(resolver.resolve("${LEVAIN_PLAYBOOK_TEST_ENV}"), "from-env");
    assertEquals(resolver.resolve("${defaultedVar}"), "from-default");

    resolver.setScopedVar("cfgVar", "from-scoped-${LEVAIN_PLAYBOOK_TEST_ENV}");
    assertEquals(resolver.resolve("${cfgVar}"), "from-scoped-from-env");

    resolver.markRuntimeVar("cfgVar");
    assertEquals(
      resolver.resolve("${cfgVar}"),
      t("cmd.explain.placeholder.runtimeVar", { name: "cfgVar" }),
    );

    resolver.setScopedVar("cfgVar", "restored-value");
    assertEquals(resolver.resolve("${cfgVar}"), "restored-value");
  } finally {
    Deno.env.delete("LEVAIN_PLAYBOOK_TEST_ENV");
  }
});

Deno.test("PlaybookVarResolver should never prompt or leak passwords and should format user identity placeholders cleanly", () => {
  const origPrompt = globalThis.prompt;
  globalThis.prompt = () => {
    throw new Error("PlaybookVarResolver must never prompt interactively");
  };

  try {
    const config = TestHelper.getConfig();
    config.password = "UltraSecret#99";

    const resolver = new PlaybookVarResolver(config);

    // Password is always a placeholder, even when configured on config
    const pw = resolver.resolve("https://${levain.login}:${levain.password}@example.org");
    assertFalse(pw.includes("UltraSecret#99"));
    assertStringIncludes(pw, t("cmd.explain.placeholder.login"));
    assertStringIncludes(pw, t("cmd.explain.placeholder.password"));

    const pwEncoded = resolver.resolve("${levain.login | urlEncode}:${levain.password | urlEncode}");
    assertFalse(pwEncoded.includes("UltraSecret#99"));
    assertStringIncludes(pwEncoded, "(URL-encoded)>");
    assertStringIncludes(pwEncoded, t("cmd.explain.placeholder.passwordUrlEncoded"));

    // Unset email / fullname return placeholders without prompting
    assertEquals(resolver.resolve("${levain.email}"), t("cmd.explain.placeholder.email"));
    assertEquals(resolver.resolve("${levain.fullname}"), t("cmd.explain.placeholder.fullname"));

    // Configured identity values are resolved and URL-encoded when requested
    config.login = "jane doe";
    config.email = "jane@example.org";
    config.fullname = "Jane Doe";
    assertEquals(resolver.resolve("${levain.login | urlEncode}"), "jane%20doe");
    assertEquals(resolver.resolve("${levain.email}"), "jane@example.org");
    assertEquals(resolver.resolve("${levain.fullname}"), "Jane Doe");

    // Defense-in-depth: accidental raw password in literal text is still masked
    const masked = resolver.resolve("token=UltraSecret#99");
    assertFalse(masked.includes("UltraSecret#99"));
    assertStringIncludes(masked, "******");
  } finally {
    globalThis.prompt = origPrompt;
  }
});

Deno.test("PlaybookVarResolver should terminate cleanly on cyclic variable definitions", () => {
  const { config, pkg: cyclicPkg } = makePkg(
    "cyclic",
    'a: "${b}"\nb: "${a}"\n',
  );
  const resolver = new PlaybookVarResolver(config);

  const result = resolver.resolve("prefix-${a}", cyclicPkg);
  assertStringIncludes(result, "prefix-");
});
