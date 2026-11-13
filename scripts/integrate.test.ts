import { assertEquals } from "@std/assert";
import {
  getFilesToCheck,
  getTargetedTests,
  IntegrateDeps,
  Logger,
  Options,
  parseArgs,
  parseGitStatusOutput,
  runCascade,
} from "./integrate.ts";

function createSilentLogger(): Logger {
  return {
    log: () => {},
    error: () => {},
  };
}

Deno.test("integrate.ts - parseArgs", async (t) => {
  await t.step("should parse default flags when no arguments provided", () => {
    const opts = parseArgs([]);
    assertEquals(opts.quick, false);
    assertEquals(opts.verbose, false);
  });

  await t.step("should detect --quick flag", () => {
    const opts = parseArgs(["--quick"]);
    assertEquals(opts.quick, true);
    assertEquals(opts.verbose, false);
  });

  await t.step("should detect --verbose flag", () => {
    const opts = parseArgs(["--verbose"]);
    assertEquals(opts.quick, false);
    assertEquals(opts.verbose, true);
  });

  await t.step("should detect -v flag", () => {
    const opts = parseArgs(["-v"]);
    assertEquals(opts.quick, false);
    assertEquals(opts.verbose, true);
  });

  await t.step("should detect multiple flags together", () => {
    const opts = parseArgs(["--quick", "-v"]);
    assertEquals(opts.quick, true);
    assertEquals(opts.verbose, true);
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

Deno.test("integrate.ts - runCascade with mocked dependencies", async (t) => {
  await t.step("should skip Level 1 and 2 if no TS files changed, and run Level 3", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: async () => ({
        allChanged: ["README.md", "recipes/app.yaml"],
        tsChanged: [],
      }),
      runDenoCommand: async (_title, args) => {
        executedCommands.push(args);
        return { success: true, durationMs: 10 };
      },
      fileExists: () => true,
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false }, deps);
    assertEquals(res.success, true);
    // Only Level 3 command was executed
    assertEquals(executedCommands.length, 1);
    assertEquals(executedCommands[0], ["test", "--allow-all", "--parallel", "--fail-fast"]);
  });

  await t.step("should skip Level 3 when quick mode is enabled", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: async () => ({
        allChanged: ["src/action/copy.ts"],
        tsChanged: ["src/action/copy.ts"],
      }),
      runDenoCommand: async (_title, args) => {
        executedCommands.push(args);
        return { success: true, durationMs: 10 };
      },
      fileExists: (p) => p === "src/action/copy.test.ts",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: true, verbose: false }, deps);
    assertEquals(res.success, true);
    // Level 1 (check) and Level 2 (targeted test) ran, but Level 3 was skipped
    assertEquals(executedCommands.length, 2);
    assertEquals(executedCommands[0], ["check", "src/action/copy.ts"]);
    assertEquals(executedCommands[1], ["test", "--allow-all", "src/action/copy.test.ts"]);
  });

  await t.step("should fast-fail at Level 1 and abort before Level 2 and 3", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: async () => ({
        allChanged: ["src/action/copy.ts"],
        tsChanged: ["src/action/copy.ts"],
      }),
      runDenoCommand: async (_title, args) => {
        executedCommands.push(args);
        if (args[0] === "check") {
          return { success: false, durationMs: 15 };
        }
        return { success: true, durationMs: 10 };
      },
      fileExists: () => true,
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false }, deps);
    assertEquals(res.success, false);
    assertEquals(res.failedLevel, 1);
    assertEquals(executedCommands.length, 1);
    assertEquals(executedCommands[0], ["check", "src/action/copy.ts"]);
  });

  await t.step("should fast-fail at Level 2 and abort before Level 3", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: async () => ({
        allChanged: ["src/action/copy.ts"],
        tsChanged: ["src/action/copy.ts"],
      }),
      runDenoCommand: async (_title, args) => {
        executedCommands.push(args);
        if (args[0] === "test" && args.includes("src/action/copy.test.ts")) {
          return { success: false, durationMs: 25 };
        }
        return { success: true, durationMs: 10 };
      },
      fileExists: (p) => p === "src/action/copy.test.ts",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false }, deps);
    assertEquals(res.success, false);
    assertEquals(res.failedLevel, 2);
    assertEquals(executedCommands.length, 2);
    assertEquals(executedCommands[0], ["check", "src/action/copy.ts"]);
    assertEquals(executedCommands[1], ["test", "--allow-all", "src/action/copy.test.ts"]);
  });

  await t.step("should fail when Level 3 fails", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: async () => ({
        allChanged: ["src/action/copy.ts"],
        tsChanged: ["src/action/copy.ts"],
      }),
      runDenoCommand: async (_title, args) => {
        executedCommands.push(args);
        if (args.includes("--parallel")) {
          return { success: false, durationMs: 100 };
        }
        return { success: true, durationMs: 10 };
      },
      fileExists: (p) => p === "src/action/copy.test.ts",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false }, deps);
    assertEquals(res.success, false);
    assertEquals(res.failedLevel, 3);
    assertEquals(executedCommands.length, 3);
  });

  await t.step("should pass all levels when all checks succeed", async () => {
    const executedCommands: string[][] = [];
    const deps: IntegrateDeps = {
      getChangedFiles: async () => ({
        allChanged: ["src/action/copy.ts"],
        tsChanged: ["src/action/copy.ts"],
      }),
      runDenoCommand: async (_title, args) => {
        executedCommands.push(args);
        return { success: true, durationMs: 10 };
      },
      fileExists: (p) => p === "src/action/copy.test.ts",
      logger: createSilentLogger(),
    };

    const res = await runCascade({ quick: false, verbose: false }, deps);
    assertEquals(res.success, true);
    assertEquals(executedCommands.length, 3);
  });
});
