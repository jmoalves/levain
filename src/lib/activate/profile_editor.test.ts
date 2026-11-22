import {
  assertEquals,
  assertStringIncludes,
} from "@std/assert";

import ProfileEditor from "./profile_editor.ts";

Deno.test("insertBlock creates a new profile when it does not exist", async () => {
  const dir = await Deno.makeTempDir();

  try {
    const profile = `${dir}/.bashrc`;
    const editor = new ProfileEditor();
    await editor.insertBlock(profile, "TEST BLOCK");
    const content = await Deno.readTextFile(profile);
    assertEquals(content, "TEST BLOCK\n");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("insertBlock appends block to an existing profile", async () => {
  const dir = await Deno.makeTempDir();

  try {
    const profile = `${dir}/.bashrc`;
    await Deno.writeTextFile(profile, "export PATH=/usr/bin");
    const editor = new ProfileEditor();
    await editor.insertBlock(profile, "TEST BLOCK");
    const content = await Deno.readTextFile(profile);

    assertEquals(
      content,
      "export PATH=/usr/bin\n\nTEST BLOCK\n",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("insertBlock replaces an existing levain block", async () => {
  const dir = await Deno.makeTempDir();

  try {
    const profile = `${dir}/.bashrc`;

    await Deno.writeTextFile(
      profile,
      `before

${ProfileEditor.BEGIN}
old block
${ProfileEditor.END}

after`,
    );

    const editor = new ProfileEditor();
    const replacement = `${ProfileEditor.BEGIN}
new block
${ProfileEditor.END}`;

    await editor.insertBlock(profile, replacement);
    const content = await Deno.readTextFile(profile);

    assertStringIncludes(content, "before");
    assertStringIncludes(content, "after");
    assertStringIncludes(content, "new block");

    assertEquals(content.includes("old block"), false);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("insertBlock does not duplicate levain block", async () => {
  const dir = await Deno.makeTempDir();

  try {
    const profile = `${dir}/.bashrc`;
    const editor = new ProfileEditor();
    const block = `${ProfileEditor.BEGIN}
hello
${ProfileEditor.END}`;

    await editor.insertBlock(profile, block);
    await editor.insertBlock(profile, block);

    const content = await Deno.readTextFile(profile);
    const matches =
      content.match(/# >>> levain initialize >>>/g) ?? [];

    assertEquals(matches.length, 1);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("insertBlock creates parent directories", async () => {
  const dir = await Deno.makeTempDir();

  try {
    const profile = `${dir}/nested/deep/profile.ps1`;
    const editor = new ProfileEditor();
    await editor.insertBlock(profile, "TEST");
    const content = await Deno.readTextFile(profile);

    assertEquals(content, "TEST\n");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});