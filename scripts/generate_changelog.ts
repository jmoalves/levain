/**
 * Generates human-readable, grouped GitHub Release notes from `--first-parent`
 * git log records between the last stable (`Latest`) release and the new tag.
 *
 * Designed to run standalone (`deno run --no-config --allow-read`) during CI
 * releases with zero external dependencies.
 */

export interface RawCommitRecord {
  subject: string;
  body: string;
}

export type ChangelogCategory =
  | "features"
  | "fixes"
  | "performance"
  | "docs"
  | "other"
  | "maintenance";

export interface ClassifiedCommit {
  category: ChangelogCategory;
  formatted: string;
}

export interface ChangelogInput {
  repo: string;
  fromVersion: string;
  toVersion: string;
  denoVersion: string;
  inventoryMarkdown?: string;
  records: RawCommitRecord[];
}

export interface CliChangelogArgs {
  repo: string;
  fromVersion: string;
  toVersion: string;
  denoVersion: string;
  inventoryPath?: string;
  commitsFile?: string;
}

const SKIP_SUBJECT_PATTERNS = [
  /^vHEAD\b/i,
  /^v\d+/i,
  /^\(skipChangelog\)/i,
  /^-?\s*skip:/i,
  /^chore\(release\):/i,
  /^Merge PR#\d+/i,
];

const INTERNAL_SCOPES = new Set(["workflow", "testing", "ci", "deps"]);

const INTERNAL_LEGACY_PATTERN =
  /^(?:testing:|test-e2e:|CLAUDE\.md\b|\.kopiaignore\b|Merge pull request #\d+ from .+\/dependabot\/)/i;

const MERGE_PR_PATTERN = /^Merge pull request #(\d+)\s+from\s+(\S+)/;

const CONVENTIONAL_PATTERN = /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

export function parseGitLogRecords(raw: string): RawCommitRecord[] {
  if (!raw.trim()) {
    return [];
  }
  const records: RawCommitRecord[] = [];
  for (const chunk of raw.split("\x1e")) {
    const trimmed = chunk.replace(/^\r?\n+/, "");
    if (!trimmed) {
      continue;
    }
    const sepIdx = trimmed.indexOf("\x1f");
    if (sepIdx === -1) {
      records.push({ subject: trimmed.trim(), body: "" });
    } else {
      records.push({
        subject: trimmed.slice(0, sepIdx).trim(),
        body: trimmed.slice(sepIdx + 1).trim(),
      });
    }
  }
  return records;
}

export function normalizeCommitSubject(record: RawCommitRecord): string {
  const subject = record.subject.trim();
  const mergeMatch = subject.match(MERGE_PR_PATTERN);
  if (mergeMatch) {
    const prNumber = mergeMatch[1];
    const branchRef = mergeMatch[2];
    const firstBodyLine = record.body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (firstBodyLine) {
      const hasPrSuffix = new RegExp(`\\(#${prNumber}\\)$`).test(firstBodyLine);
      const normalizedTitle = hasPrSuffix ? firstBodyLine : `${firstBodyLine} (#${prNumber})`;
      // Keep dependabot merges recognizable so they route to maintenance
      if (branchRef.includes("/dependabot/") && !CONVENTIONAL_PATTERN.test(firstBodyLine)) {
        return `chore(deps): ${normalizedTitle}`;
      }
      return normalizedTitle;
    }
  }
  return subject;
}

export function shouldSkipCommit(subject: string): boolean {
  if (!subject) {
    return true;
  }
  return SKIP_SUBJECT_PATTERNS.some((re) => re.test(subject));
}

export function classifyCommit(record: RawCommitRecord): ClassifiedCommit | undefined {
  const normalized = normalizeCommitSubject(record);
  if (shouldSkipCommit(normalized)) {
    return undefined;
  }

  if (INTERNAL_LEGACY_PATTERN.test(normalized)) {
    return { category: "maintenance", formatted: normalized };
  }

  const conv = normalized.match(CONVENTIONAL_PATTERN);
  if (conv) {
    const type = conv[1].toLowerCase();
    const scope = conv[2]?.trim();
    const breaking = Boolean(conv[3]);
    const description = conv[4].trim();

    const prefixParts: string[] = [];
    if (breaking) {
      prefixParts.push("**BREAKING:**");
    }
    if (scope) {
      prefixParts.push(`**${scope}:**`);
    }
    const formatted = prefixParts.length > 0 ? `${prefixParts.join(" ")} ${description}` : description;
    const isInternalScope = scope !== undefined && INTERNAL_SCOPES.has(scope.toLowerCase());

    switch (type) {
      case "feat":
        return { category: "features", formatted };
      case "fix":
        return { category: isInternalScope ? "maintenance" : "fixes", formatted };
      case "perf":
        return { category: "performance", formatted };
      case "docs":
        return { category: isInternalScope ? "maintenance" : "docs", formatted };
      case "test":
      case "chore":
      case "refactor":
      case "style":
      case "build":
      case "ci":
        return { category: "maintenance", formatted };
      default:
        return { category: "other", formatted };
    }
  }

  return { category: "other", formatted: normalized };
}

function normalizeTag(version: string): string {
  const cleaned = version.trim();
  return cleaned.startsWith("v") ? cleaned : `v${cleaned}`;
}

export function renderChangelog(input: ChangelogInput): string {
  const fromTag = normalizeTag(input.fromVersion);
  const toTag = normalizeTag(input.toVersion);

  const buckets: Record<ChangelogCategory, string[]> = {
    features: [],
    fixes: [],
    performance: [],
    docs: [],
    other: [],
    maintenance: [],
  };

  // Preserve reverse-chronological order (newest first) from `git log --first-parent`
  for (const record of input.records) {
    const classified = classifyCommit(record);
    if (classified) {
      buckets[classified.category].push(classified.formatted);
    }
  }

  const lines: string[] = [
    "**WARNING:** Some security software may block `levain.exe`. Ask your Systems Administrator for advice.",
    "**TIP:** To test this release without `levain.exe` (using official upstream `deno.exe` + `levain.bundle.js`), set `$levainBundle=\"true\"` before running `install.ps1` or download `levain-bundle-windows-x86_64.zip`.",
    "",
    "## Support Binaries",
    "| Software | Version |",
    "| :--- | :--- |",
    `| Deno | ${input.denoVersion.trim()} |`,
  ];

  if (input.inventoryMarkdown) {
    for (const invLine of input.inventoryMarkdown.split(/\r?\n/)) {
      const trimmed = invLine.trim();
      if (trimmed) {
        lines.push(trimmed);
      }
    }
  }

  lines.push("");
  lines.push(`## Changes from \`${fromTag}\` to \`${toTag}\``);

  const hasAnyChange = Object.values(buckets).some((items) => items.length > 0);
  if (!hasAnyChange) {
    lines.push("");
    lines.push("_No notable changes recorded._");
  } else {
    lines.push("*(Newest changes are listed first in each section.)*");

    const sections: Array<{ key: Exclude<ChangelogCategory, "maintenance">; title: string }> = [
      { key: "features", title: "### ✨ New Features" },
      { key: "fixes", title: "### 🐛 Bug Fixes" },
      { key: "performance", title: "### ⚡ Performance" },
      { key: "docs", title: "### 📖 Documentation" },
      { key: "other", title: "### 📌 Other Changes" },
    ];

    for (const section of sections) {
      const items = buckets[section.key];
      if (items.length === 0) {
        continue;
      }
      lines.push("");
      lines.push(section.title);
      for (const item of items) {
        lines.push(`- ${item}`);
      }
    }

    if (buckets.maintenance.length > 0) {
      lines.push("");
      lines.push("<details>");
      lines.push(`<summary>Maintenance, Tests & CI (${buckets.maintenance.length})</summary>`);
      lines.push("");
      for (const item of buckets.maintenance) {
        lines.push(`- ${item}`);
      }
      lines.push("");
      lines.push("</details>");
    }
  }

  lines.push("");
  lines.push(`**Full Changelog:** https://github.com/${input.repo}/compare/${fromTag}...${toTag}`);

  return lines.join("\n") + "\n";
}

export function parseCliArgs(args: string[]): CliChangelogArgs {
  let repo = "jmoalves/levain";
  let fromVersion = "";
  let toVersion = "";
  let denoVersion = "";
  let inventoryPath: string | undefined;
  let commitsFile: string | undefined;

  const takeValue = (flag: string, idx: number): string => {
    if (idx + 1 >= args.length || !args[idx + 1]) {
      throw new Error(`Missing value for ${flag}`);
    }
    return args[idx + 1];
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--repo":
        repo = takeValue(arg, i++);
        break;
      case "--from":
        fromVersion = takeValue(arg, i++);
        break;
      case "--to":
        toVersion = takeValue(arg, i++);
        break;
      case "--deno-version":
        denoVersion = takeValue(arg, i++);
        break;
      case "--inventory":
        inventoryPath = takeValue(arg, i++);
        break;
      case "--commits-file":
        commitsFile = takeValue(arg, i++);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!fromVersion || !toVersion || !denoVersion) {
    throw new Error("Required arguments: --from <version> --to <version> --deno-version <version>");
  }

  return { repo, fromVersion, toVersion, denoVersion, inventoryPath, commitsFile };
}

export function readOptionalFile(filePath?: string): string | undefined {
  if (!filePath) {
    return undefined;
  }
  try {
    return Deno.readTextFileSync(filePath);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return undefined;
    }
    throw err;
  }
}

export function runCli(args: string[]): string {
  const parsed = parseCliArgs(args);
  const rawCommits = parsed.commitsFile ? Deno.readTextFileSync(parsed.commitsFile) : "";
  const inventoryMarkdown = readOptionalFile(parsed.inventoryPath);
  return renderChangelog({
    repo: parsed.repo,
    fromVersion: parsed.fromVersion,
    toVersion: parsed.toVersion,
    denoVersion: parsed.denoVersion,
    inventoryMarkdown,
    records: parseGitLogRecords(rawCommits),
  });
}

if (import.meta.main) {
  console.log(runCli(Deno.args).trimEnd());
}
