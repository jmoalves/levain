import {
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { stub } from "@std/testing/mock";

import PowershellInitializer from "./powershell_initializer.ts";
import OsUtils from "../os/os_utils.ts";
import ProfileEditor from "./profile_editor.ts";

Deno.test("findProfile returns trimmed profile path", async () => {
  const runStub = stub(
    OsUtils,
    "runAndLog",
    // deno-lint-ignore require-await
    async () => "C:\\Users\\test\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1\r\n",
  );

  try {
    const initializer = new PowershellInitializer(
      "C:\\Levain",
      undefined,
    );

    const profile = await initializer.findProfile();

    assertEquals(
      profile,
      "C:\\Users\\test\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1",
    );
  } finally {
    runStub.restore();
  }
});

Deno.test("profileTemplate contains prompt wrapper", () => {
  const initializer = new PowershellInitializer(
    "C:\\Levain",
    undefined,
  );

  const template = initializer.profileTemplate();

  assertStringIncludes(template, ProfileEditor.BEGIN);
  assertStringIncludes(template, ProfileEditor.END);

  assertStringIncludes(template, "Get-Variable PrePrompt");
  assertStringIncludes(template, "function global:levain");
  assertStringIncludes(
    template,
    '. "C:\\Levain\\levain.ps1" @Args',
  );
});

Deno.test("install uses supplied profile", async () => {
  const dir = await Deno.makeTempDir();

  try {
    const profile = `${dir}/profile.ps1`;
    await Deno.writeTextFile(profile, "");

    const initializer = new PowershellInitializer(
      "C:\\Levain",
      profile,
    );

    await initializer.install();

    const text = await Deno.readTextFile(profile);

    assertStringIncludes(text, "function global:levain");
    assertStringIncludes(
      text,
      '. "C:\\Levain\\levain.ps1" @Args',
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("install discovers profile when not provided", async () => {
  const dir = await Deno.makeTempDir();

  try {
    const profile = `${dir}/profile.ps1`;
    await Deno.writeTextFile(profile, "");

    const runStub = stub(
      OsUtils,
      "runAndLog",
      // deno-lint-ignore require-await
      async () => profile,
    );

    try {
      const initializer = new PowershellInitializer(
        "C:\\Levain",
        undefined,
      );

      await initializer.install();

      const text = await Deno.readTextFile(profile);

      assertStringIncludes(text, "function global:levain");
    } finally {
      runStub.restore();
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});