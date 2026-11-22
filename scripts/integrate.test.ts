import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  getFilesToCheck,
  getTargetedTests,
  IntegrateDeps,
  Logger,
  parseArgs,
  parseGitStatusOutput,
  runCascade,
  validateI18nCatalogs,
} from "./integrate.ts";

function createSilentLogger(): Logger {
  return {
    log: () => {},
    error: () => {},
  };
}

function createCapturedLogger() {
  const logs: string[] = [];
  const errors: string[] = [];
  return {
    logs,
    errors,
    logger: {
      log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      error: (...args: unknown[]) => errors.push(args.map(String).join(" ")),
    },
  };
}

Deno.test("integrate.ts - parseArgs", async (t) => {
  await t.step("should parse default flags when no arguments provided", () => {
    const opts = parseArgs([]);
    assertEquals(opts.quick, false);
    assertEquals(opts.verbose, false);
    assertEquals(opts.checkI18nOnly, false);
  });

  await t.step("should detect --quick flag", () => {
    const opts = parseArgs(["--quick"]);
    assertEquals(opts.quick, true);
    assertEquals(opts.verbose, false);
    assertEquals(opts.checkI18nOnly, false);
  });

  await t.step("should detect --verbose flag", () => {
    const opts = parseArgs(["--verbose"]);
    assertEquals(opts.quick, false);
    assertEquals(opts.verbose, true);
    assertEquals(opts.checkI18nOnly, false);
  });

  await t.step("should detect -v flag", () => {
    const opts = parseArgs(["-v"]);
    assertEquals(opts.quick, false);
    assertEquals(opts.verbose, true);
    assertEquals(opts.checkI18nOnly, false);
  });

  await t.step("should detect --check-i18n flag", () => {
    const opts = parseArgs(["--check-i18n"]);
    assertEquals(opts.checkI18nOnly, true);
  });

  await t.step("should detect multiple flags together", () => {
    const opts = parseArgs(["--quick", "-v"]);
    assertEquals(opts.quick, true);
    assertEquals(opts.verbose, true);
    assertEquals(opts.checkI18nOnly, false);
  });
});

Deno.test("integrate.ts - parseGitStatusOutput", async (t) => {
  await t.step("should parse modified, untracked, and added files", () => {
    const gitOutput = `
 M src/action/copy.ts
?? src/cmd/new_cmd.ts
A  README.md
`;
    const res = parseGitStatusOutput(gitOutput);
    assertEquals(res.allChanged, [
      "src/action/copy.ts",
      "src/cmd/new_cmd.ts",
      "README.md",
    ]);
    assertEquals(res.tsChanged, [
      "src/action/copy.ts",
      "src/cmd/new_cmd.ts",
    ]);
  });

  await t.step("should parse renamed files using the target path", () => {
    const gitOutput = `
R  src/old_name.ts -> src/renamed.ts
R  docs/old.md -> docs/new.md
`;
    const res = parseGitStatusOutput(gitOutput);
    assertEquals(res.allChanged, [
      "src/renamed.ts",
      "docs/new.md",
    ]);
    assertEquals(res.tsChanged, [
      "src/renamed.ts",
    ]);
  });

  await t.step("should ignore ts files inside testdata/ directories", () => {
    const gitOutput = `
 M src/testdata/sample.ts
 M src/action/copy.ts
`;
    const res = parseGitStatusOutput(gitOutput);
    assertEquals(res.allChanged, [
      "src/testdata/sample.ts",
      "src/action/copy.ts",
    ]);
    assertEquals(res.tsChanged, [
      "src/action/copy.ts",
    ]);
  });

  await t.step("should handle empty or whitespace-only output", () => {
    const res = parseGitStatusOutput("   \n\n  \n");
    assertEquals(res.allChanged, []);
    assertEquals(res.tsChanged, []);
  });
});

Deno.test("integrate.ts - getFilesToCheck", async (t) => {
  await t.step("should return empty array when no ts files changed", () => {
    assertEquals(getFilesToCheck([]), []);
  });

  await t.step("should return changed files if levain entrypoint is not affected", () => {
    const files = ["src/action/copy.ts", "src/cmd/list.ts"];
    assertEquals(getFilesToCheck(files), files);
  });

  await t.step("should collapse to levain.ts when levain.ts is modified", () => {
    const files = ["src/action/copy.ts", "levain.ts"];
    assertEquals(getFilesToCheck(files), ["levain.ts"]);
  });

  await t.step("should collapse to levain.ts when files starting with src/levain are modified", () => {
    const files = ["src/action/copy.ts", "src/levain_cli.ts"];
    assertEquals(getFilesToCheck(files), ["levain.ts"]);
  });
});

Deno.test("integrate.ts - getTargetedTests", async (t) => {
  await t.step("should map .ts file to sibling .test.ts when it exists", () => {
    const existing = new Set(["src/action/copy.test.ts"]);
    const fileExistsMock = (p: string) => existing.has(p);

    const tests = getTargetedTests(["src/action/copy.ts"], fileExistsMock);
    assertEquals(tests, ["src/action/copy.test.ts"]);
  });

  await t.step("should include directly changed .test.ts file when it exists", () => {
    const existing = new Set(["src/action/copy.test.ts"]);
    const fileExistsMock = (p: string) => existing.has(p);

    const tests = getTargetedTests(["src/action/copy.test.ts"], fileExistsMock);
    assertEquals(tests, ["src/action/copy.test.ts"]);
  });

  await t.step("should ignore .ts file when sibling .test.ts does not exist", () => {
    const fileExistsMock = (_p: string) => false;
    const tests = getTargetedTests(["src/action/no_test.ts"], fileExistsMock);
    assertEquals(tests, []);
  });

  await t.step("should ignore .test.ts if file does not exist (e.g. deleted)", () => {
    const fileExistsMock = (_p: string) => false;
    const tests = getTargetedTests(["src/action/deleted.test.ts"], fileExistsMock);
    assertEquals(tests, []);
  });

  await t.step("should deduplicate tests when both source and test files changed", () => {
    const existing = new Set(["src/action/copy.test.ts"]);
    const fileExistsMock = (p: string) => existing.has(p);

    const tests = getTargetedTests(
      ["src/action/copy.ts", "src/action/copy.test.ts"],
      fileExistsMock,
    );
    assertEquals(tests, ["src/action/copy.test.ts"]);
  });
});

Deno.test("integrate.ts - validateI18nCatalogs", async (t) => {
  await t.step("passes when catalogs have matching keys and placeholders", () => {
    const en = JSON.stringify({ cmd: { hello: "Hi {{name}}", unescaped: "URL {{- url}}" } });
    const pt = JSON.stringify({ cmd: { hello: "Olá {{ name }}", unescaped: "URL {{- url}}" } });
    const res = validateI18nCatalogs(en, pt);
    assertEquals(res, { valid: true, errors: [] });
  });

  await t.step("detects missing keys in either catalog", () => {
    const en = JSON.stringify({ a: "1", b: "2" });
    const pt = JSON.stringify({ a: "1", c: "3" });
    const res = validateI18nCatalogs(en, pt);
    assertEquals(res.valid, false);
    assertEquals(res.errors.length, 2);
  });

  await t.step("detects malformed placeholders, JS template syntax, and dotted key names", () => {
    const en = JSON.stringify({
      clean: { "cmd.clean.cleaned": "Cleaned {{amount}}" },
      bad: "rename {{old} to ${target}",
    });
    const pt = JSON.stringify({
      clean: { "cmd.clean.cleaned": "Limpo {{amount}}" },
      bad: "renomear {{old}} para {{target}}",
    });
    const res = validateI18nCatalogs(en, pt);
    assertEquals(res.valid, false);
    const joined = res.errors.join("\n");
    assertStringIncludes(joined, "contains a literal '.'");
    assertStringIncludes(joined, "malformed '{{...}}'");
    assertStringIncludes(joined, "JS template syntax");
  });

  await t.step("detects placeholder mismatches between en and pt", () => {
    const en = JSON.stringify({ greeting: "Hello {{user}}" });
    const pt = JSON.stringify({ greeting: "Olá {{nome}}" });
    const res = validateI18nCatalogs(en, pt);
    assertEquals(res.valid, false);
    assertStringIncludes(res.errors[0], "Placeholder mismatch");
  });
});

Deno.test("integrate.ts - runCascade with mocked dependencies", async (t) => {
  await t.step("should skip typecheck/lint/targeted if no TS files changed, validate i18n, and run Level 3", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: () =>
        Promise.resolve({
          allChanged: ["README.md", "recipes/app.yaml"],
          tsChanged: [],
        }),
      runDenoCommand: (_title, args) => {
        executedCommands.push(args);
        return Promise.resolve({ success: true, durationMs: 10 });
      },
      validateI18n: () => ({ valid: true, errors: [] }),
      fileExists: () => true,
      os: "windows",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false, checkI18nOnly: false }, deps);
    assertEquals(res.success, true);
    assertEquals(executedCommands, [["test", "--allow-all", "--parallel", "--fail-fast"]]);
  });

  await t.step("should skip Level 3 when quick mode is enabled", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: () =>
        Promise.resolve({
          allChanged: ["src/action/copy.ts"],
          tsChanged: ["src/action/copy.ts"],
        }),
      runDenoCommand: (_title, args) => {
        executedCommands.push(args);
        return Promise.resolve({ success: true, durationMs: 10 });
      },
      validateI18n: () => ({ valid: true, errors: [] }),
      fileExists: (p) => p === "src/action/copy.ts" || p === "src/action/copy.test.ts",
      os: "windows",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: true, verbose: false, checkI18nOnly: false }, deps);
    assertEquals(res.success, true);
    assertEquals(executedCommands, [
      ["check", "src/action/copy.ts"],
      ["lint", "src/action/copy.ts"],
      ["test", "--allow-all", "src/action/copy.test.ts"],
    ]);
  });

  await t.step("should fast-fail at Level 1a (typecheck) before lint and tests", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: () =>
        Promise.resolve({
          allChanged: ["src/action/copy.ts"],
          tsChanged: ["src/action/copy.ts"],
        }),
      runDenoCommand: (_title, args) => {
        executedCommands.push(args);
        if (args[0] === "check") {
          return Promise.resolve({ success: false, durationMs: 15 });
        }
        return Promise.resolve({ success: true, durationMs: 10 });
      },
      validateI18n: () => ({ valid: true, errors: [] }),
      fileExists: () => true,
      os: "windows",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false, checkI18nOnly: false }, deps);
    assertEquals(res.success, false);
    assertEquals(res.failedLevel, 1);
    assertEquals(executedCommands, [["check", "src/action/copy.ts"]]);
  });

  await t.step("should fast-fail at Level 1b (lint) before tests", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: () =>
        Promise.resolve({
          allChanged: ["src/action/copy.ts"],
          tsChanged: ["src/action/copy.ts"],
        }),
      runDenoCommand: (_title, args) => {
        executedCommands.push(args);
        if (args[0] === "lint") {
          return Promise.resolve({ success: false, durationMs: 12 });
        }
        return Promise.resolve({ success: true, durationMs: 10 });
      },
      validateI18n: () => ({ valid: true, errors: [] }),
      fileExists: () => true,
      os: "windows",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false, checkI18nOnly: false }, deps);
    assertEquals(res.success, false);
    assertEquals(res.failedLevel, 1);
    assertEquals(executedCommands, [
      ["check", "src/action/copy.ts"],
      ["lint", "src/action/copy.ts"],
    ]);
  });

  await t.step("should fast-fail at Level 1c (i18n) before running tests", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: () =>
        Promise.resolve({
          allChanged: ["src/locales/en/translation.json"],
          tsChanged: [],
        }),
      runDenoCommand: (_title, args) => {
        executedCommands.push(args);
        return Promise.resolve({ success: true, durationMs: 10 });
      },
      validateI18n: () => ({ valid: false, errors: ["[pt] Missing translation key 'foo'"] }),
      fileExists: () => true,
      os: "windows",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false, checkI18nOnly: false }, deps);
    assertEquals(res.success, false);
    assertEquals(res.failedLevel, 1);
    assertEquals(executedCommands, []);
  });

  await t.step("should fast-fail at Level 2 and abort before Level 3", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: () =>
        Promise.resolve({
          allChanged: ["src/action/copy.ts"],
          tsChanged: ["src/action/copy.ts"],
        }),
      runDenoCommand: (_title, args) => {
        executedCommands.push(args);
        if (args[0] === "test" && args.includes("src/action/copy.test.ts")) {
          return Promise.resolve({ success: false, durationMs: 25 });
        }
        return Promise.resolve({ success: true, durationMs: 10 });
      },
      validateI18n: () => ({ valid: true, errors: [] }),
      fileExists: (p) => p === "src/action/copy.ts" || p === "src/action/copy.test.ts",
      os: "windows",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false, checkI18nOnly: false }, deps);
    assertEquals(res.success, false);
    assertEquals(res.failedLevel, 2);
    assertEquals(executedCommands, [
      ["check", "src/action/copy.ts"],
      ["lint", "src/action/copy.ts"],
      ["test", "--allow-all", "src/action/copy.test.ts"],
    ]);
  });

  await t.step("should fail when Level 3 fails", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: () =>
        Promise.resolve({
          allChanged: ["src/action/copy.ts"],
          tsChanged: ["src/action/copy.ts"],
        }),
      runDenoCommand: (_title, args) => {
        executedCommands.push(args);
        if (args.includes("--parallel")) {
          return Promise.resolve({ success: false, durationMs: 100 });
        }
        return Promise.resolve({ success: true, durationMs: 10 });
      },
      validateI18n: () => ({ valid: true, errors: [] }),
      fileExists: (p) => p === "src/action/copy.ts" || p === "src/action/copy.test.ts",
      os: "windows",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false, checkI18nOnly: false }, deps);
    assertEquals(res.success, false);
    assertEquals(res.failedLevel, 3);
    assertEquals(executedCommands.length, 4);
  });

  await t.step("should print a non-Windows platform notice on Linux/macOS", async () => {
    const captured = createCapturedLogger();
    const deps: IntegrateDeps = {
      getChangedFiles: () =>
        Promise.resolve({
          allChanged: ["src/action/copy.ts"],
          tsChanged: ["src/action/copy.ts"],
        }),
      runDenoCommand: () => Promise.resolve({ success: true, durationMs: 10 }),
      validateI18n: () => ({ valid: true, errors: [] }),
      fileExists: (p) => p === "src/action/copy.ts" || p === "src/action/copy.test.ts",
      os: "linux",
      logger: captured.logger,
    };

    const res = await runCascade({ quick: false, verbose: false, checkI18nOnly: false }, deps);
    assertEquals(res.success, true);
    assertStringIncludes(captured.logs.join("\n"), "Platform notice");
    assertStringIncludes(captured.logs.join("\n"), "deno task test:windows");
  });

  await t.step("should run only i18n validation when checkI18nOnly is enabled (pass & fail)", async () => {
    let gitCalled = false;
    let denoCalled = false;
    const okLog = createCapturedLogger();

    const passRes = await runCascade(
      { quick: false, verbose: false, checkI18nOnly: true },
      {
        getChangedFiles: () => {
          gitCalled = true;
          return Promise.resolve({ allChanged: [], tsChanged: [] });
        },
        runDenoCommand: () => {
          denoCalled = true;
          return Promise.resolve({ success: true, durationMs: 0 });
        },
        validateI18n: () => ({ valid: true, errors: [] }),
        logger: okLog.logger,
      },
    );
    assertEquals(passRes, { success: true });
    assertEquals(gitCalled, false);
    assertEquals(denoCalled, false);
    assertStringIncludes(okLog.logs.join("\n"), "i18n Catalog Validation - PASSED");

    const errLog = createCapturedLogger();
    const failRes = await runCascade(
      { quick: false, verbose: false, checkI18nOnly: true },
      {
        getChangedFiles: () => Promise.resolve({ allChanged: [], tsChanged: [] }),
        runDenoCommand: () => Promise.resolve({ success: true, durationMs: 0 }),
        validateI18n: () => ({ valid: false, errors: ["[pt] Missing key 'x'"] }),
        logger: errLog.logger,
      },
    );
    assertEquals(failRes.success, false);
    assertEquals(failRes.failedLevel, 1);
    assertStringIncludes(errLog.errors.join("\n"), "Missing key 'x'");
  });
});
