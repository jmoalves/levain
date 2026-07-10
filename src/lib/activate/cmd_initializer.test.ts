import {
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { stub } from "@std/testing/mock";

import CmdInitializer from "./cmd_initializer.ts";
import OsUtils from "../os/os_utils.ts";

Deno.test("hookTemplate contains expected commands", () => {
  const initializer = new CmdInitializer(
    "C:\\Levain",
    "C:\\Users\\test\\.levain",
  );

  const template = initializer.hookTemplate();

  assertStringIncludes(template, "_LEVAIN_OLD_PROMPT");
  assertStringIncludes(
    template,
    'doskey levain=call "C:\\Levain\\levain.cmd" $*',
  );
});

Deno.test("createHook creates hook file", async () => {
  const dir = await Deno.makeTempDir();

  try {
    const initializer = new CmdInitializer(
      "C:\\Levain",
      dir,
    );

    await initializer.createHook();

    const text = await Deno.readTextFile(
      `${dir}/levain-hook.cmd`,
    );

    assertStringIncludes(text, 'doskey levain=call "C:\\Levain\\levain.cmd"');
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("findExistingAutorun returns existing value", async () => {
  const runStub = stub(
    OsUtils,
    "runAndLog",
    // deno-lint-ignore require-await
    async () => `
HKEY_CURRENT_USER\\Software\\Microsoft\\Command Processor

    AutoRun    REG_SZ    echo hello
`,
  );

  try {
    const initializer = new CmdInitializer(
      "C:\\Levain",
      "C:\\Users\\test\\.levain",
    );

    const value = await initializer.findExistingAutorun();

    assertEquals(value, "echo hello");
  } finally {
    runStub.restore();
  }
});

Deno.test("findExistingAutorun returns empty when AutoRun does not exist", async () => {
  const runStub = stub(
    OsUtils,
    "runAndLog",
    // deno-lint-ignore require-await
    async () => {
      throw new Error("Registry value not found");
    },
  );

  try {
    const initializer = new CmdInitializer(
      "C:\\Levain",
      "C:\\Users\\test\\.levain",
    );

    const value = await initializer.findExistingAutorun();

    assertEquals(value, "");
  } finally {
    runStub.restore();
  }
});

Deno.test("registerAutorun creates AutoRun when none exists", async () => {
  let command: string[] | undefined;

  const runStub = stub(
    OsUtils,
    "runAndLog",
    // deno-lint-ignore require-await
    async (cmd: string | string[]) => {
      command = cmd as string[];
      return "";
    },
  );

  try {
    const initializer = new CmdInitializer(
      "C:\\Levain",
      "C:\\Users\\test\\.levain",
    );

    await initializer.registerAutorun("");

    assertEquals(command, [
      "reg",
      "add",
      "HKCU\\Software\\Microsoft\\Command Processor",
      "/v",
      "AutoRun",
      "/t",
      "REG_SZ",
      "/d",
      '@CALL "C:\\Users\\test\\.levain\\levain-hook.cmd"',
      "/f",
    ]);
  } finally {
    runStub.restore();
  }
});

Deno.test("registerAutorun appends to existing AutoRun", async () => {
  let command: string[] | undefined;

  const runStub = stub(
    OsUtils,
    "runAndLog",
    // deno-lint-ignore require-await
    async (cmd: string | string[]) => {
      command = cmd as string[];
      return "";
    },
  );

  try {
    const initializer = new CmdInitializer(
      "C:\\Levain",
      "C:\\Users\\test\\.levain",
    );

    await initializer.registerAutorun("echo hello");

    assertEquals(command, [
      "reg",
      "add",
      "HKCU\\Software\\Microsoft\\Command Processor",
      "/v",
      "AutoRun",
      "/t",
      "REG_SZ",
      "/d",
      'echo hello & @CALL "C:\\Users\\test\\.levain\\levain-hook.cmd"',
      "/f",
    ]);
  } finally {
    runStub.restore();
  }
});

Deno.test("install registers AutoRun when hook is missing", async () => {
  const initializer = new CmdInitializer(
    "C:\\Levain",
    "C:\\Users\\test\\.levain",
  );

  let created = false;
  let registered = "";

  const createStub = stub(
    initializer,
    "createHook",
    // deno-lint-ignore require-await
    async () => {
      created = true;
    },
  );

  const findStub = stub(
    initializer,
    "findExistingAutorun",
    // deno-lint-ignore require-await
    async () => "echo hello",
  );

  const registerStub = stub(
    initializer,
    "registerAutorun",
    // deno-lint-ignore require-await
    async (existing: string) => {
      registered = existing;
    },
  );

  try {
    await initializer.install();

    assertEquals(created, true);
    assertEquals(registered, "echo hello");
  } finally {
    registerStub.restore();
    findStub.restore();
    createStub.restore();
  }
});

Deno.test("install skips registration when hook already exists", async () => {
  const initializer = new CmdInitializer(
    "C:\\Levain",
    "C:\\Users\\test\\.levain",
  );

  const hook =
    '@CALL "C:\\Users\\test\\.levain\\levain-hook.cmd"';

  let registered = false;

  const createStub = stub(
    initializer,
    "createHook",
    async () => {},
  );

  const findStub = stub(
    initializer,
    "findExistingAutorun",
    // deno-lint-ignore require-await
    async () => `echo hello & ${hook}`,
  );

  const registerStub = stub(
    initializer,
    "registerAutorun",
    // deno-lint-ignore require-await
    async () => {
      registered = true;
    },
  );

  try {
    await initializer.install();

    assertEquals(registered, false);
  } finally {
    registerStub.restore();
    findStub.restore();
    createStub.restore();
  }
});