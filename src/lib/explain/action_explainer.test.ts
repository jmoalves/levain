import * as path from "@std/path";
import { assertEquals, assertStringIncludes } from "@std/assert";

import t from "../i18n.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import TestHelper from "../test/test_helper.ts";
import { explainActionLine } from "./action_explainer.ts";
import { PlaybookVarResolver } from "./playbook_resolver.ts";

function setup() {
  const config = TestHelper.getConfig();
  const baseDir = path.join(config.configPaths.levainHome, "demo");
  const filePath = path.join(config.configPaths.levainHome, "recipes", "demo.levain.yaml");
  const pkg = new FileSystemPackage(
    config,
    "demo",
    baseDir,
    filePath,
    'version: 1.0.0\ndownloadUrl: "https://example.org/demo-1.0.0.zip"\n',
  );
  const resolver = new PlaybookVarResolver(config);
  return { config, pkg, resolver };
}

Deno.test("explainActionLine should handle empty line, unknown action, and parse errors via fallback", () => {
  const { pkg, resolver } = setup();

  const empty = explainActionLine(pkg, "   ", resolver);
  assertEquals(empty.action, "");
  assertEquals(empty.text, "   ");

  const unknown = explainActionLine(pkg, "futureCustomAction foo ${name}", resolver);
  assertEquals(unknown.action, "futureCustomAction");
  assertEquals(unknown.text, t("cmd.explain.step.fallback", { line: "futureCustomAction foo demo" }));

  // Missing required option value triggers parseArgs error -> caught and rendered as fallback
  const badFlag = explainActionLine(pkg, "template --replace", resolver);
  assertEquals(badFlag.action, "template");
  assertEquals(badFlag.text, t("cmd.explain.step.fallback", { line: "template --replace" }));

  // Works when pkg is undefined and preserves angle-bracket placeholders without path.resolve
  const noPkg = explainActionLine(undefined, 'mkdir "<custom dir>"', resolver);
  assertStringIncludes(noPkg.text, "<custom dir>");
  const noPkgLocal = explainActionLine(undefined, "mkdir local-dir", resolver);
  assertStringIncludes(noPkgLocal.text, path.resolve("local-dir"));
});

Deno.test("explainActionLine should translate filesystem and transfer actions (mkdir, copy, extract, clone, mavenCopy, backupFile)", () => {
  const { pkg, resolver } = setup();

  // mkdir
  assertStringIncludes(explainActionLine(pkg, "mkdir ${baseDir}/bin", resolver).text, path.resolve(pkg.baseDir, "bin"));
  assertEquals(
    explainActionLine(pkg, "mkdir --compact ${baseDir}/bin", resolver).text,
    t("cmd.explain.step.mkdirCompact", { dir: path.resolve(pkg.baseDir, "bin") }),
  );
  assertStringIncludes(explainActionLine(pkg, "mkdir", resolver).text, "mkdir");

  // copy (local, flags, remote URL, missing args)
  const localCopy = explainActionLine(pkg, "copy --strip --ifNotExists a.txt b.txt ${baseDir}", resolver);
  assertStringIncludes(localCopy.text, path.resolve(pkg.pkgDir, "a.txt"));
  assertStringIncludes(localCopy.text, t("cmd.explain.step.noteStripDir"));
  assertStringIncludes(localCopy.text, t("cmd.explain.step.noteIfNotExists"));

  const remoteCopy = explainActionLine(pkg, "copy ${downloadUrl} ${baseDir}", resolver);
  assertEquals(
    remoteCopy.text,
    t("cmd.explain.step.download", {
      src: "`https://example.org/demo-1.0.0.zip`",
      dst: pkg.baseDir,
      suffix: "",
    }),
  );
  assertStringIncludes(explainActionLine(pkg, "copy onlyOneArg", resolver).text, "copy onlyOneArg");

  // extract (local, remote, --strip, missing args)
  const localExtract = explainActionLine(pkg, "extract archive.zip ${baseDir}", resolver);
  assertEquals(
    localExtract.text,
    t("cmd.explain.step.extract", {
      src: path.resolve(pkg.pkgDir, "archive.zip"),
      dst: pkg.baseDir,
      suffix: "",
    }),
  );
  const remoteExtract = explainActionLine(pkg, "extract --strip ${downloadUrl} ${baseDir}", resolver);
  assertEquals(
    remoteExtract.text,
    t("cmd.explain.step.downloadAndExtract", {
      src: "https://example.org/demo-1.0.0.zip",
      dst: pkg.baseDir,
      suffix: ` (${t("cmd.explain.step.noteStripArchive")})`,
    }),
  );
  assertStringIncludes(explainActionLine(pkg, "extract onlyOne", resolver).text, "extract onlyOne");

  // clone (plain, #branch, missing args)
  assertEquals(
    explainActionLine(pkg, "clone https://example.org/repo.git ${baseDir}/src", resolver).text,
    t("cmd.explain.step.clone", {
      url: "https://example.org/repo.git",
      dst: path.resolve(pkg.baseDir, "src"),
    }),
  );
  assertEquals(
    explainActionLine(pkg, "clone https://example.org/repo.git#main ${baseDir}/src", resolver).text,
    t("cmd.explain.step.cloneBranch", {
      url: "https://example.org/repo.git",
      branch: "main",
      dst: path.resolve(pkg.baseDir, "src"),
    }),
  );
  assertStringIncludes(explainActionLine(pkg, "clone onlyOne", resolver).text, "clone onlyOne");

  // mavenCopy & backupFile
  assertEquals(
    explainActionLine(pkg, "mavenCopy org.example:lib:1.0 ${baseDir}/lib", resolver).text,
    t("cmd.explain.step.mavenCopy", {
      coordinates: "org.example:lib:1.0",
      dst: path.resolve(pkg.baseDir, "lib"),
      suffix: "",
    }),
  );
  assertStringIncludes(
    explainActionLine(pkg, "mavenCopy --ifNotExists org.example:lib:1.0 ${baseDir}/lib", resolver).text,
    t("cmd.explain.step.noteIfNotExists"),
  );
  assertStringIncludes(explainActionLine(pkg, "mavenCopy onlyOne", resolver).text, "mavenCopy onlyOne");

  assertEquals(
    explainActionLine(pkg, "backupFile /etc/app.conf", resolver).text,
    t("cmd.explain.step.backupFile", { file: path.normalize("/etc/app.conf") }),
  );
  assertStringIncludes(explainActionLine(pkg, "backupFile", resolver).text, "backupFile");
});

Deno.test("explainActionLine should translate env, var, shell, template, json, and property actions with scoped/runtime tracking", () => {
  const { pkg, resolver } = setup();

  // addPath
  assertEquals(
    explainActionLine(pkg, "addPath ${baseDir}/bin", resolver).text,
    t("cmd.explain.step.addPath", { dir: path.resolve(pkg.baseDir, "bin") }),
  );
  assertEquals(
    explainActionLine(pkg, "addPath --permanent ${baseDir}/bin", resolver).text,
    t("cmd.explain.step.addPathPermanent", { dir: path.resolve(pkg.baseDir, "bin") }),
  );
  assertStringIncludes(explainActionLine(pkg, "addPath", resolver).text, "addPath");

  // setVar + setEnv track scoped vars for subsequent actions
  assertEquals(
    explainActionLine(pkg, "setVar TOOL_VER 3.9", resolver).text,
    t("cmd.explain.step.setVar", { name: "TOOL_VER", value: "3.9" }),
  );
  assertStringIncludes(explainActionLine(pkg, "setVar onlyOne", resolver).text, "setVar onlyOne");

  assertEquals(
    explainActionLine(pkg, "setEnv DEMO_VER ${TOOL_VER}", resolver).text,
    t("cmd.explain.step.setEnv", { key: "DEMO_VER", value: "3.9" }),
  );
  assertEquals(
    explainActionLine(pkg, "setEnv --permanent DEMO_HOME ${baseDir}", resolver).text,
    t("cmd.explain.step.setEnvPermanent", { key: "DEMO_HOME", value: pkg.baseDir }),
  );
  assertStringIncludes(explainActionLine(pkg, "setEnv onlyOne", resolver).text, "setEnv onlyOne");

  // levainShell (normal, re-quoting args with spaces, --ignoreErrors, --saveVar marks runtime var, missing args)
  assertEquals(
    explainActionLine(pkg, "levainShell echo ${DEMO_VER}", resolver).text,
    t("cmd.explain.step.runCommand", { command: "echo 3.9" }),
  );
  assertEquals(
    explainActionLine(pkg, 'levainShell git config --global user.name "Jane Doe"', resolver).text,
    t("cmd.explain.step.runCommand", { command: 'git config --global user.name "Jane Doe"' }),
  );
  assertEquals(
    explainActionLine(pkg, "levainShell --ignoreErrors git status", resolver).text,
    t("cmd.explain.step.runCommandIgnoreErrors", { command: "git status" }),
  );
  assertEquals(
    explainActionLine(pkg, "levainShell --saveVar GIT_SHA --stripCRLF git rev-parse HEAD", resolver).text,
    t("cmd.explain.step.runCommandSaveVar", { command: "git rev-parse HEAD", varName: "GIT_SHA" }),
  );
  assertStringIncludes(
    explainActionLine(pkg, "echo SHA=${GIT_SHA}", resolver).text,
    t("cmd.explain.placeholder.runtimeVar", { name: "GIT_SHA" }),
  );
  assertStringIncludes(explainActionLine(pkg, "levainShell", resolver).text, "levainShell");

  // template (including --doubleBackslash escaping)
  const tpl = explainActionLine(
    pkg,
    "template --replace @HOME@ --with ${DEMO_HOME} --replace @VER@ --with ${DEMO_VER} settings.tpl ${baseDir}/settings.xml",
    resolver,
  );
  assertStringIncludes(tpl.text, "`@HOME@` →");
  assertStringIncludes(tpl.text, "`@VER@` → `3.9`");
  const dblTpl = explainActionLine(
    pkg,
    "template --doubleBackslash --replace @DIR@ --with C:/dev/app src.tpl dst.txt",
    resolver,
  );
  assertStringIncludes(dblTpl.text, "`@DIR@` → `C:\\\\dev\\\\app`");
  assertStringIncludes(
    explainActionLine(pkg, "template src.tpl dst.txt", resolver).text,
    "-",
  );
  assertStringIncludes(explainActionLine(pkg, "template onlyOne", resolver).text, "template onlyOne");

  // jsonSet / jsonGet / jsonRemove
  assertEquals(
    explainActionLine(pkg, "jsonSet cfg.json a.b 42", resolver).text,
    t("cmd.explain.step.jsonSet", { file: "cfg.json", property: "a.b", value: "42" }),
  );
  assertEquals(
    explainActionLine(pkg, "jsonSet --ifNotExists cfg.json a.b 42", resolver).text,
    t("cmd.explain.step.jsonSetIfNotExists", { file: "cfg.json", property: "a.b", value: "42" }),
  );
  assertStringIncludes(explainActionLine(pkg, "jsonSet cfg.json a.b", resolver).text, "jsonSet");

  assertEquals(
    explainActionLine(pkg, "jsonGet --setVar PORT cfg.json server.port", resolver).text,
    t("cmd.explain.step.jsonGet", { file: "cfg.json", property: "server.port", varName: "PORT", suffix: "" }),
  );
  assertEquals(
    explainActionLine(pkg, "jsonGet --setVar PORT --default 8080 cfg.json server.port", resolver).text,
    t("cmd.explain.step.jsonGet", {
      file: "cfg.json",
      property: "server.port",
      varName: "PORT",
      suffix: ` (${t("cmd.explain.step.noteDefault", { value: "8080" })})`,
    }),
  );
  assertStringIncludes(explainActionLine(pkg, "jsonGet cfg.json server.port", resolver).text, "jsonGet");

  assertEquals(
    explainActionLine(pkg, "jsonRemove cfg.json old.key", resolver).text,
    t("cmd.explain.step.jsonRemove", { file: "cfg.json", property: "old.key" }),
  );
  assertStringIncludes(explainActionLine(pkg, "jsonRemove cfg.json", resolver).text, "jsonRemove");

  // propertySet / propertyGet
  assertEquals(
    explainActionLine(pkg, "propertySet app.properties key val", resolver).text,
    t("cmd.explain.step.propertySet", { file: "app.properties", property: "key", value: "val" }),
  );
  assertEquals(
    explainActionLine(pkg, "propertySet --ifNotExists app.properties key val", resolver).text,
    t("cmd.explain.step.propertySetIfNotExists", { file: "app.properties", property: "key", value: "val" }),
  );
  assertStringIncludes(explainActionLine(pkg, "propertySet app.properties key", resolver).text, "propertySet");

  assertEquals(
    explainActionLine(pkg, "propertyGet --setVar HOST app.properties host", resolver).text,
    t("cmd.explain.step.propertyGet", { file: "app.properties", property: "host", varName: "HOST", suffix: "" }),
  );
  assertEquals(
    explainActionLine(pkg, "propertyGet --setVar HOST --default localhost app.properties host", resolver).text,
    t("cmd.explain.step.propertyGet", {
      file: "app.properties",
      property: "host",
      varName: "HOST",
      suffix: ` (${t("cmd.explain.step.noteDefault", { value: "localhost" })})`,
    }),
  );
  assertStringIncludes(explainActionLine(pkg, "propertyGet app.properties host", resolver).text, "propertyGet");
});

Deno.test("explainActionLine should translate checks, OS integration, and internal actions", () => {
  const { pkg, resolver } = setup();

  // checkEnvExists
  assertEquals(
    explainActionLine(pkg, "checkEnvExists JAVA_HOME", resolver).text,
    t("cmd.explain.step.checkEnvExists", { name: "JAVA_HOME" }),
  );
  assertEquals(
    explainActionLine(pkg, "checkEnvExists JAVA_HOME JDK_HOME", resolver).text,
    t("cmd.explain.step.checkAnyEnvExists", { names: "`JAVA_HOME`, `JDK_HOME`" }),
  );
  assertStringIncludes(explainActionLine(pkg, "checkEnvExists", resolver).text, "checkEnvExists");

  // checkFileExists
  assertEquals(
    explainActionLine(pkg, "checkFileExists /tmp/a", resolver).text,
    t("cmd.explain.step.checkFileExists", { file: path.normalize("/tmp/a") }),
  );
  assertEquals(
    explainActionLine(pkg, "checkFileExists /tmp/a /tmp/b", resolver).text,
    t("cmd.explain.step.checkAnyFileExists", {
      files: `\`${path.normalize("/tmp/a")}\`, \`${path.normalize("/tmp/b")}\``,
    }),
  );
  assertStringIncludes(explainActionLine(pkg, "checkFileExists", resolver).text, "checkFileExists");

  // checkPathContains
  assertEquals(
    explainActionLine(pkg, "checkPathContains /tmp/bin", resolver).text,
    t("cmd.explain.step.checkPathContains", { dir: path.normalize("/tmp/bin") }),
  );
  assertEquals(
    explainActionLine(pkg, "checkPathContains /tmp/a /tmp/b", resolver).text,
    t("cmd.explain.step.checkAnyPathContains", {
      dirs: `\`${path.normalize("/tmp/a")}\`, \`${path.normalize("/tmp/b")}\``,
    }),
  );
  assertStringIncludes(explainActionLine(pkg, "checkPathContains", resolver).text, "checkPathContains");

  // checkChainDirExists
  const dir1 = path.normalize("/dir1");
  const dir2 = path.normalize("/dir2");
  assertEquals(
    explainActionLine(pkg, "checkChainDirExists /dir1 /dir2", resolver).text,
    t("cmd.explain.step.checkChainDir", { dirs: `\`${dir1}\`, \`${dir2}\`` }),
  );
  assertEquals(
    explainActionLine(pkg, "checkChainDirExists --saveVar FOUND_DIR --default /fallback /dir1 /dir2", resolver).text,
    t("cmd.explain.step.checkChainDirSaveVar", {
      dirs: `\`${dir1}\`, \`${dir2}\``,
      varName: "FOUND_DIR",
      suffix: ` (${t("cmd.explain.step.noteDefault", { value: "/fallback" })})`,
    }),
  );
  assertStringIncludes(explainActionLine(pkg, "checkChainDirExists", resolver).text, "checkChainDirExists");

  // checkPort & checkUrl
  assertEquals(
    explainActionLine(pkg, "checkPort --port 8080", resolver).text,
    t("cmd.explain.step.checkPort", { port: "8080", transport: "TCP" }),
  );
  assertEquals(
    explainActionLine(pkg, "checkPort --port 5353 --transport udp --address 127.0.0.1", resolver).text,
    t("cmd.explain.step.checkPort", { port: "127.0.0.1:5353", transport: "UDP" }),
  );
  assertStringIncludes(explainActionLine(pkg, "checkPort", resolver).text, "checkPort");

  assertEquals(
    explainActionLine(pkg, "checkUrl https://example.org", resolver).text,
    t("cmd.explain.step.checkUrl", { url: "https://example.org" }),
  );
  assertStringIncludes(explainActionLine(pkg, "checkUrl", resolver).text, "checkUrl");

  // assertContains & inspect
  assertEquals(
    explainActionLine(pkg, 'assertContains "ok" "status: ok"', resolver).text,
    t("cmd.explain.step.assertContains", { text: "ok", fullText: "status: ok" }),
  );
  assertStringIncludes(explainActionLine(pkg, "assertContains onlyOne", resolver).text, "assertContains");

  const outFile = path.normalize("/tmp/out.txt");
  assertEquals(
    explainActionLine(pkg, "inspect --regExp /v(\\d+)/ --saveVar VER /tmp/out.txt", resolver).text,
    t("cmd.explain.step.inspectWithPatterns", {
      file: outFile,
      patterns: "`/v(\\d+)/`",
      vars: "`VER`",
    }),
  );
  assertEquals(
    explainActionLine(pkg, "inspect --saveVar RAW /tmp/out.txt", resolver).text,
    t("cmd.explain.step.inspect", { file: outFile, vars: "`RAW`" }),
  );
  assertStringIncludes(explainActionLine(pkg, "inspect /tmp/out.txt", resolver).text, "inspect");

  // Shortcuts & context menu & killProcess
  const binApp = path.normalize("/bin/app");
  assertEquals(
    explainActionLine(pkg, "addToDesktop /bin/app", resolver).text,
    t("cmd.explain.step.addToDesktop", { target: binApp }),
  );
  assertStringIncludes(explainActionLine(pkg, "addToDesktop", resolver).text, "addToDesktop");

  assertEquals(
    explainActionLine(pkg, "addToStartMenu /bin/app", resolver).text,
    t("cmd.explain.step.addToStartMenu", { target: binApp }),
  );
  assertEquals(
    explainActionLine(pkg, "addToStartMenu /bin/app DevTools", resolver).text,
    t("cmd.explain.step.addToStartMenuFolder", { target: binApp, folder: "DevTools" }),
  );
  assertStringIncludes(explainActionLine(pkg, "addToStartMenu", resolver).text, "addToStartMenu");

  assertEquals(
    explainActionLine(pkg, "addToStartup /bin/app", resolver).text,
    t("cmd.explain.step.addToStartup", { target: binApp }),
  );
  assertStringIncludes(explainActionLine(pkg, "addToStartup", resolver).text, "addToStartup");

  assertEquals(
    explainActionLine(pkg, 'contextMenu folders --id demo --name "Open Demo" --cmd "demo.exe"', resolver).text,
    t("cmd.explain.step.contextMenu", { name: "Open Demo", cmd: "demo.exe" }),
  );
  assertEquals(
    explainActionLine(pkg, 'contextMenu --id demo --name "Open Demo" --cmd "demo.exe"', resolver).text,
    t("cmd.explain.step.contextMenu", { name: "Open Demo", cmd: "demo.exe" }),
  );
  assertStringIncludes(explainActionLine(pkg, "contextMenu folders --id demo", resolver).text, "contextMenu");

  assertEquals(
    explainActionLine(pkg, "contextMenuRemove folders --id demo", resolver).text,
    t("cmd.explain.step.contextMenuRemove", { id: "demo" }),
  );
  assertEquals(
    explainActionLine(pkg, "contextMenuRemove --id demo", resolver).text,
    t("cmd.explain.step.contextMenuRemove", { id: "demo" }),
  );
  assertStringIncludes(explainActionLine(pkg, "contextMenuRemove folders", resolver).text, "contextMenuRemove");

  assertEquals(
    explainActionLine(pkg, "killProcess java.exe", resolver).text,
    t("cmd.explain.step.killProcess", { processName: "java.exe" }),
  );
  assertStringIncludes(explainActionLine(pkg, "killProcess", resolver).text, "killProcess");

  // Misc / internal actions
  assertEquals(
    explainActionLine(pkg, "echo hello world", resolver).text,
    t("cmd.explain.step.echo", { message: "hello world" }),
  );
  assertEquals(
    explainActionLine(pkg, "defaultPackage jdk", resolver).text,
    t("cmd.explain.step.defaultPackage", { pkgName: "jdk" }),
  );
  assertStringIncludes(explainActionLine(pkg, "defaultPackage", resolver).text, "defaultPackage");

  assertEquals(
    explainActionLine(pkg, "shellPath /bin/bash", resolver).text,
    t("cmd.explain.step.shellPath", { shellPath: path.normalize("/bin/bash") }),
  );
  assertStringIncludes(explainActionLine(pkg, "shellPath", resolver).text, "shellPath");

  assertEquals(
    explainActionLine(pkg, "removeFromRegistry pkgA pkgB", resolver).text,
    t("cmd.explain.step.removeFromRegistry", { packages: "`pkgA`, `pkgB`" }),
  );
  assertStringIncludes(explainActionLine(pkg, "removeFromRegistry", resolver).text, "removeFromRegistry");

  assertEquals(explainActionLine(pkg, "activateInit", resolver).text, t("cmd.explain.step.activateInit"));
  assertEquals(
    explainActionLine(pkg, "activatePre jdk", resolver).text,
    t("cmd.explain.step.activateInternal", { action: "activatePre" }),
  );
  assertEquals(
    explainActionLine(pkg, "activateCmd --shell bash", resolver).text,
    t("cmd.explain.step.activateInternal", { action: "activateCmd" }),
  );
  assertEquals(explainActionLine(pkg, "saveConfig", resolver).text, t("cmd.explain.step.saveConfig"));
});
