import { assertEquals, assertFalse, assertStringIncludes, assertThrows } from "@std/assert";

import {
  classifyCommit,
  normalizeCommitSubject,
  parseCliArgs,
  parseGitLogRecords,
  readOptionalFile,
  renderChangelog,
  runCli,
  shouldSkipCommit,
} from "./generate_changelog.ts";

Deno.test("parseGitLogRecords parses unit/record-separated git log output cleanly", () => {
  assertEquals(parseGitLogRecords("   \n  "), []);

  const raw = [
    "feat(cli): add thing (#10)\x1fBody line 1\nBody line 2\x1e",
    "fix(os): simple fix\x1e",
    "chore(deps): bump dep\x1f\x1e",
  ].join("\n");

  assertEquals(parseGitLogRecords(raw), [
    { subject: "feat(cli): add thing (#10)", body: "Body line 1\nBody line 2" },
    { subject: "fix(os): simple fix", body: "" },
    { subject: "chore(deps): bump dep", body: "" },
  ]);
});

Deno.test("normalizeCommitSubject extracts PR title from GitHub merge commits and tags dependabot", () => {
  assertEquals(
    normalizeCommitSubject({
      subject: "Merge pull request #193 from jmoalves/perf/startup-and-repos",
      body: "perf(repo): optimize startup and crawling\n\nDetails...",
    }),
    "perf(repo): optimize startup and crawling (#193)",
  );

  // Does not duplicate (#PR) suffix if already present in body
  assertEquals(
    normalizeCommitSubject({
      subject: "Merge pull request #191 from jmoalves/feat/cliffy",
      body: "feat(cli): adopt cliffy (#191)",
    }),
    "feat(cli): adopt cliffy (#191)",
  );

  // Dependabot merge without conventional prefix gets tagged chore(deps)
  assertEquals(
    normalizeCommitSubject({
      subject: "Merge pull request #177 from jmoalves/dependabot/github_actions/actions/checkout-7.0.1",
      body: "Bump actions/checkout from 4 to 7",
    }),
    "chore(deps): Bump actions/checkout from 4 to 7 (#177)",
  );

  // Merge commit with empty body falls back to original subject
  assertEquals(
    normalizeCommitSubject({
      subject: "Merge pull request #176 from jmoalves/chore/hardening",
      body: "",
    }),
    "Merge pull request #176 from jmoalves/chore/hardening",
  );
});

Deno.test("classifyCommit groups conventional, breaking, internal, legacy, and skipped commits", () => {
  assertEquals(shouldSkipCommit(""), true);
  assertEquals(shouldSkipCommit("chore(release): bump version to 1.1.2-SNAPSHOT (#220)"), true);
  assertEquals(shouldSkipCommit("skip: 0.93.2-SNAPSHOT"), true);
  assertEquals(shouldSkipCommit("(skipChangelog) internal"), true);
  assertEquals(shouldSkipCommit("v1.0.0"), true);
  assertEquals(shouldSkipCommit("Merge PR#175"), true);
  assertEquals(shouldSkipCommit("feat(cmd): add explain"), false);

  assertEquals(classifyCommit({ subject: "chore(release): bump version (#220)", body: "" }), undefined);
  assertEquals(classifyCommit({ subject: "feat(workflow): dual releases (#219)", body: "" }), {
    category: "features",
    formatted: "**workflow:** dual releases (#219)",
  });
  assertEquals(classifyCommit({ subject: "feat!: breaking CLI change", body: "" }), {
    category: "features",
    formatted: "**BREAKING:** breaking CLI change",
  });
  assertEquals(classifyCommit({ subject: "fix(os): support accents (#223)", body: "" }), {
    category: "fixes",
    formatted: "**os:** support accents (#223)",
  });
  assertEquals(classifyCommit({ subject: "fix(workflow): scan with Defender (#215)", body: "" }), {
    category: "maintenance",
    formatted: "**workflow:** scan with Defender (#215)",
  });
  assertEquals(classifyCommit({ subject: "perf(cli): reduce spawns (#202)", body: "" }), {
    category: "performance",
    formatted: "**cli:** reduce spawns (#202)",
  });
  assertEquals(classifyCommit({ subject: "docs(cli): overhaul README (#197)", body: "" }), {
    category: "docs",
    formatted: "**cli:** overhaul README (#197)",
  });
  assertEquals(classifyCommit({ subject: "docs(workflow): add release guide (#207)", body: "" }), {
    category: "maintenance",
    formatted: "**workflow:** add release guide (#207)",
  });
  assertEquals(classifyCommit({ subject: "test(testing): add E2E runner (#205)", body: "" }), {
    category: "maintenance",
    formatted: "**testing:** add E2E runner (#205)",
  });
  assertEquals(classifyCommit({ subject: "testing: pin libvirt URI", body: "" }), {
    category: "maintenance",
    formatted: "testing: pin libvirt URI",
  });
  assertEquals(classifyCommit({ subject: "custom(foo): unusual prefix", body: "" }), {
    category: "other",
    formatted: "**foo:** unusual prefix",
  });
  assertEquals(classifyCommit({ subject: "Merge deno2_opus (v1 / Deno 2) into master", body: "" }), {
    category: "other",
    formatted: "Merge deno2_opus (v1 / Deno 2) into master",
  });
});

Deno.test("renderChangelog formats grouped notes newest-first, includes binaries, and handles empty diffs", () => {
  const md = renderChangelog({
    repo: "jmoalves/levain",
    fromVersion: "0.93.1",
    toVersion: "v1.1.2",
    denoVersion: "2.9.8",
    inventoryMarkdown: "| Git | v2.56.1.windows.1 |\n| 7-Zip | 26.06 |\n",
    records: [
      { subject: "fix(os): newest fix (#223)", body: "" },
      { subject: "chore(release): bump version to 1.1.2-SNAPSHOT (#220)", body: "" },
      { subject: "feat(workflow): dual releases (#219)", body: "" },
      { subject: "fix(os): older fix (#218)", body: "" },
      { subject: "perf(cli): faster activate (#202)", body: "" },
      { subject: "docs(cli): README overhaul (#197)", body: "" },
      { subject: "test(testing): add E2E (#205)", body: "" },
      { subject: "Merge deno2_opus (v1 / Deno 2) into master", body: "" },
    ],
  });

  assertStringIncludes(md, "| Deno | 2.9.8 |");
  assertStringIncludes(md, "| Git | v2.56.1.windows.1 |");
  assertStringIncludes(md, "## Changes from `v0.93.1` to `v1.1.2`");
  assertStringIncludes(md, "*(Newest changes are listed first in each section.)*");
  assertStringIncludes(md, "### ✨ New Features\n- **workflow:** dual releases (#219)");
  assertStringIncludes(md, "### 🐛 Bug Fixes\n- **os:** newest fix (#223)\n- **os:** older fix (#218)");
  assertStringIncludes(md, "### ⚡ Performance\n- **cli:** faster activate (#202)");
  assertStringIncludes(md, "### 📖 Documentation\n- **cli:** README overhaul (#197)");
  assertStringIncludes(md, "### 📌 Other Changes\n- Merge deno2_opus (v1 / Deno 2) into master");
  assertStringIncludes(md, "<summary>Maintenance, Tests & CI (1)</summary>");
  assertStringIncludes(md, "**Full Changelog:** https://github.com/jmoalves/levain/compare/v0.93.1...v1.1.2");
  assertFalse(md.includes("bump version"));

  // Empty diff omits all group headers
  const emptyMd = renderChangelog({
    repo: "jmoalves/levain",
    fromVersion: "1.1.1",
    toVersion: "1.1.2",
    denoVersion: "2.9.8",
    records: [{ subject: "chore(release): bump version", body: "" }],
  });
  assertStringIncludes(emptyMd, "_No notable changes recorded._");
  assertFalse(emptyMd.includes("### ✨ New Features"));
});

Deno.test("parseCliArgs, readOptionalFile, and runCli work end-to-end with files and validate errors", async () => {
  assertThrows(() => parseCliArgs(["--from", "1.0.0"]), Error, "Required arguments");
  assertThrows(() => parseCliArgs(["--from"]), Error, "Missing value");
  assertThrows(() => parseCliArgs(["--bogus"]), Error, "Unknown argument");
  assertEquals(readOptionalFile(undefined), undefined);
  assertEquals(readOptionalFile("/nonexistent/path/inventory.md"), undefined);

  const tmpDir = await Deno.makeTempDir();
  try {
    const commitsPath = `${tmpDir}/commits.txt`;
    const invPath = `${tmpDir}/inventory.md`;
    await Deno.writeTextFile(commitsPath, "feat(cmd): hello (#1)\x1f\x1e");
    await Deno.writeTextFile(invPath, "| 7-Zip | 26.06 |\n");

    const output = runCli([
      "--repo",
      "org/repo",
      "--from",
      "1.0.0",
      "--to",
      "1.1.0",
      "--deno-version",
      "2.9.8",
      "--inventory",
      invPath,
      "--commits-file",
      commitsPath,
    ]);
    assertStringIncludes(output, "### ✨ New Features\n- **cmd:** hello (#1)");
    assertStringIncludes(output, "| 7-Zip | 26.06 |");
    assertStringIncludes(output, "https://github.com/org/repo/compare/v1.0.0...v1.1.0");

    // Without --commits-file produces empty-diff note
    const noFileOut = runCli(["--from", "1.0.0", "--to", "1.1.0", "--deno-version", "2.9.8"]);
    assertStringIncludes(noFileOut, "_No notable changes recorded._");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
