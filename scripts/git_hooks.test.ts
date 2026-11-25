import { assertEquals, assertStringIncludes } from "@std/assert";
import * as path from "@std/path";

import OsUtils from "../src/lib/os/os_utils.ts";
import TestHelper from "../src/lib/test/test_helper.ts";

const repoRoot = path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), "..");
const preCommitHook = path.join(repoRoot, ".githooks", "pre-commit");
const prePushHook = path.join(repoRoot, ".githooks", "pre-push");

async function runCmd(
  cmd: string,
  args: string[],
  cwd: string,
  stdinText?: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const command = new Deno.Command(cmd, {
    args,
    cwd,
    stdin: stdinText !== undefined ? "piped" : "null",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  if (stdinText !== undefined) {
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(stdinText));
    await writer.close();
  }
  const output = await child.output();
  return {
    code: output.code,
    stdout: new TextDecoder().decode(output.stdout),
    stderr: new TextDecoder().decode(output.stderr),
  };
}

Deno.test("git hooks should block direct commits and pushes to master while allowing thematic branches and tags", async () => {
  if (OsUtils.isWindows()) {
    // POSIX /bin/sh hook invocation is verified natively on Linux CI and Git Bash on Windows
    return;
  }

  const tempRepo = TestHelper.getNewTempDir();
  assertEquals((await runCmd("git", ["init", "-b", "master"], tempRepo)).code, 0);

  // On master, pre-commit must fail with guidance
  const commitOnMaster = await runCmd("sh", [preCommitHook], tempRepo);
  assertEquals(commitOnMaster.code, 1);
  assertStringIncludes(commitOnMaster.stderr, "Direct commits to 'master' are prohibited");

  // On a thematic branch, pre-commit must succeed
  assertEquals((await runCmd("git", ["checkout", "-b", "feat/example"], tempRepo)).code, 0);
  const commitOnBranch = await runCmd("sh", [preCommitHook], tempRepo);
  assertEquals(commitOnBranch.code, 0);

  // Pushing directly to refs/heads/master must fail
  const pushToMaster = await runCmd(
    "sh",
    [prePushHook, "origin", "https://example.org/repo.git"],
    tempRepo,
    "refs/heads/master 1111111111111111111111111111111111111111 refs/heads/master 0000000000000000000000000000000000000000\n",
  );
  assertEquals(pushToMaster.code, 1);
  assertStringIncludes(pushToMaster.stderr, "Direct pushes to 'master' are prohibited");

  // Pushing a feature branch and a release tag must succeed
  const pushBranchAndTag = await runCmd(
    "sh",
    [prePushHook, "origin", "https://example.org/repo.git"],
    tempRepo,
    "refs/heads/feat/example 1111111111111111111111111111111111111111 refs/heads/feat/example 0000000000000000000000000000000000000000\n" +
      "refs/tags/v1.1.0 2222222222222222222222222222222222222222 refs/tags/v1.1.0 0000000000000000000000000000000000000000\n",
  );
  assertEquals(pushBranchAndTag.code, 0);
});
