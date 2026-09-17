import {
  assertEquals,
  assertStringIncludes,
  assertRejects,
} from "@std/assert";
import { stub } from "@std/testing/mock";

import CmderInitializer from "./cmder_initializer.ts";
import OsUtils from "../os/os_utils.ts";

Deno.test("profileTemplate contains expected Lua code", () => {
  const initializer = new CmderInitializer(
    "C:\\Levain",
    "",
  );

  const template = initializer.profileTemplate();

  assertStringIncludes(template, "clink.promptfilter");
  assertStringIncludes(template, 'os.setenv("LEVAIN_LUA_LOADED", "1")');
  assertStringIncludes(template, 'os.getenv("LEVAIN_CURRENT")');
});

Deno.test("findConfigPath returns configured path", async () => {
  const initializer = new CmderInitializer(
    "C:\\Levain",
    "C:\\Cmder\\config",
  );

  const path = await initializer.findConfigPath();

  assertEquals(path, "C:\\Cmder\\config");
});

Deno.test("findConfigPath uses CMDER_ROOT first", async () => {
  const getStub = stub(
    Deno.env,
    "get",
    (name: string) => {
      switch (name) {
        case "CMDER_ROOT":
          return "C:\\Cmder";
        default:
          return undefined;
      }
    },
  );

  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async (path: string) => path === "C:\\Cmder\\config",
  );

  try {
    const initializer = new CmderInitializer(
      "C:\\Levain",
      "",
    );

    const path = await initializer.findConfigPath();

    assertEquals(path, "C:\\Cmder\\config");
  } finally {
    existsStub.restore();
    getStub.restore();
  }
});

Deno.test("findConfigPath falls back through candidates", async () => {
  const getStub = stub(
    Deno.env,
    "get",
    (name: string) => {
      switch (name) {
        case "CMDER_ROOT":
          return "C:\\Cmder";
        case "ProgramFiles":
          return "C:\\Program Files";
        default:
          return undefined;
      }
    },
  );

  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async (path: string) =>
      path === "C:\\Program Files\\Cmder\\config",
  );

  try {
    const initializer = new CmderInitializer(
      "C:\\Levain",
      "",
    );

    const path = await initializer.findConfigPath();

    assertEquals(path, "C:\\Program Files\\Cmder\\config");
  } finally {
    existsStub.restore();
    getStub.restore();
  }
});

Deno.test("findConfigPath returns undefined when nothing exists", async () => {
  const getStub = stub(
    Deno.env,
    "get",
    (name: string) => {
      switch (name) {
        case "CMDER_ROOT":
          return "C:\\Cmder";
        case "ProgramFiles":
          return "C:\\Program Files";
        case "ProgramFiles(x86)":
          return "C:\\Program Files (x86)";
        case "LOCALAPPDATA":
          return "C:\\Users\\test\\AppData\\Local";
        default:
          return undefined;
      }
    },
  );

  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async () => false,
  );

  try {
    const initializer = new CmderInitializer(
      "C:\\Levain",
      "",
    );

    const path = await initializer.findConfigPath();

    assertEquals(path, undefined);
  } finally {
    existsStub.restore();
    getStub.restore();
  }
});

Deno.test("install throws when config directory cannot be found", async () => {
  const initializer = new CmderInitializer(
    "C:\\Levain",
    "",
  );

  const findStub = stub(
    initializer,
    "findConfigPath",
    // deno-lint-ignore require-await
    async () => undefined,
  );

  try {
    await assertRejects(
      () => initializer.install(),
      Error,
      "Could not locate the Cmder config directory",
    );
  } finally {
    findStub.restore();
  }
});