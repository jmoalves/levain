import {
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { stub } from "@std/testing/mock";
import * as path from "@std/path";

import BashInitializer from "./bash_initializer.ts";
import OsUtils from "../os/os_utils.ts";
import ProfileEditor from "./profile_editor.ts";
import HomePaths from "../paths/home_paths.ts";

const mockHome = path.join("C:\\Users", "test");

function mockProfileCandidates(home: string) {
  const result = HomePaths.profileCandidates(home);
  return stub(
    HomePaths,
    "profileCandidates",
    () => result,
  );
}

Deno.test("findProfile returns .bashrc when it exists", async () => {
  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async (p: string) => p.endsWith(".bashrc"),
  );
  const profileCandidatesStub = mockProfileCandidates(mockHome);

  try {
    const initializer = new BashInitializer("C:\\levain");

    const profile = await initializer.findProfile();

    assertEquals(profile, path.join(mockHome, ".bashrc"));
  } finally {
    existsStub.restore();
    profileCandidatesStub.restore();
  }
});

Deno.test("findProfile returns .bash_profile when .bashrc does not exist", async () => {
  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async (p: string) => p.endsWith(".bash_profile"),
  );
  const profileCandidatesStub = mockProfileCandidates(mockHome);

  try {
    const initializer = new BashInitializer("C:\\levain");

    const profile = await initializer.findProfile();

    assertEquals(profile, path.join(mockHome, ".bash_profile"));
  } finally {
    existsStub.restore();
    profileCandidatesStub.restore();
  }
});

Deno.test("findProfile returns .profile when only it exists", async () => {
  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async (p: string) => p.endsWith(".profile"),
  );
  const profileCandidatesStub = mockProfileCandidates(mockHome);

  try {
    const initializer = new BashInitializer("C:\\levain");

    const profile = await initializer.findProfile();

    assertEquals(profile, path.join(mockHome, ".profile"));
  } finally {
    existsStub.restore();
    profileCandidatesStub.restore();
  }
});

Deno.test("findProfile prefers .bash_profile when none exist", async () => {
  const existsStub = stub(
    OsUtils,
    "exists",
    // deno-lint-ignore require-await
    async () => false,
  );
  const profileCandidatesStub = mockProfileCandidates(mockHome);

  try {
    const initializer = new BashInitializer("C:\\levain");

    const profile = await initializer.findProfile();

    assertEquals(profile, path.join(mockHome, ".bash_profile"));
  } finally {
    existsStub.restore();
    profileCandidatesStub.restore();
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