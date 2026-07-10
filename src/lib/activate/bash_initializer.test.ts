import {
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { stub } from "@std/testing/mock";

import BashInitializer from "./bash_initializer.ts";
import OsUtils from "../os/os_utils.ts";
import ProfileEditor from "./profile_editor.ts";

Deno.test("findProfile returns .bashrc when it exists", async () => {
  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async (path: string) => path.endsWith(".bashrc"),
  );

  try {
    const initializer = new BashInitializer("C:\\levain");

    const profile = await initializer.findProfile("C:\\Users\\test");

    assertEquals(profile, "C:\\Users\\test\\.bashrc");
  } finally {
    existsStub.restore();
  }
});

Deno.test("findProfile returns .bash_profile when .bashrc does not exist", async () => {
  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async (path: string) => path.endsWith(".bash_profile"),
  );

  try {
    const initializer = new BashInitializer("C:\\levain");

    const profile = await initializer.findProfile("C:\\Users\\test");

    assertEquals(profile, "C:\\Users\\test\\.bash_profile");
  } finally {
    existsStub.restore();
  }
});

Deno.test("findProfile returns .profile when only it exists", async () => {
  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async (path: string) => path.endsWith(".profile"),
  );

  try {
    const initializer = new BashInitializer("C:\\levain");

    const profile = await initializer.findProfile("C:\\Users\\test");

    assertEquals(profile, "C:\\Users\\test\\.profile");
  } finally {
    existsStub.restore();
  }
});

Deno.test("findProfile prefers .bash_profile when none exist", async () => {
  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async () => false,
  );

  try {
    const initializer = new BashInitializer("C:\\levain");

    const profile = await initializer.findProfile("C:\\Users\\test");

    assertEquals(profile, "C:\\Users\\test\\.bash_profile");
  } finally {
    existsStub.restore();
  }
});

Deno.test("profileTemplate contains required sections", () => {
  const windowsToBashStub = stub(
    OsUtils,
    "windowsToBashPath",
    () => "C:\\levain",
  );

  try {
    const initializer = new BashInitializer("C:\\levain");

    const template = initializer.profileTemplate();

    assertStringIncludes(template, ProfileEditor.BEGIN);
    assertStringIncludes(template, ProfileEditor.END);

    assertStringIncludes(template, "PROMPT_COMMAND");
    assertStringIncludes(template, 'PS1');
    assertStringIncludes(template, "levain()");
  } finally {
    windowsToBashStub.restore();
  }
});

Deno.test("install inserts template into discovered profile", async () => {
  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async (path: string) => path.endsWith(".bashrc"),
  );

  let insertedProfile = "";
  let insertedText = "";

  const insertStub = stub(
    ProfileEditor.prototype,
    "insertBlock",
    // deno-lint-ignore require-await
    async (profile: string, text: string) => {
      insertedProfile = profile;
      insertedText = text;
    },
  );

  try {
    const initializer = new BashInitializer("C:\\levain", "C:\\Users\\test\\.bashrc");

    await initializer.install();

    assertEquals(insertedProfile, "C:\\Users\\test\\.bashrc");
    assertStringIncludes(insertedText, "PS1");
    assertStringIncludes(insertedText, "source /c/levain/levain.sh");
  } finally {
    insertStub.restore();
    existsStub.restore();
  }
});