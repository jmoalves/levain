---
name: levain-integrate
description: Run smart fast-fail checks (deno check, deno lint, i18n parity, targeted tests, full test suite), enforce conventional commit approval, push to remote, and guide Pull Request (PR/MR) creation in the Levain repository.
---

# Levain Integration & Pre-Commit Protocol

Use this skill when you finish making code changes, before proposing or creating any git commits, or when the user asks to integrate, verify, push, and open a PR for the codebase.

## Goals
1. Minimize CPU and token usage via a 3-level fast-fail cascade.
2. Prevent regressions across typing, lint, i18n catalogs, and unit tests on Deno 2.
3. Enforce Conventional Commits in English.
4. **Human-in-the-Loop:** Always obtain explicit user approval before committing or pushing.
5. Provide a streamlined path from integration checks to Push and Pull Request targeting `master`.

---

## The 3-Level Fast-Fail Cascade

The integration runner ([`scripts/integrate.ts`](../../../scripts/integrate.ts)) inspects `git status` and executes checks in ascending order of cost:

```text
[Git Diff Analysis]
       │
       ▼
[Level 1: Type Check + Lint + i18n Validation] ──► (Failed? Abort immediately)
       │ (Passed)
       ▼
[Level 2: Targeted Unit Tests]                 ──► (Failed? Abort immediately)
       │ (Passed)
       ▼
[Level 3: Full Parallel Suite]                 ──► (Failed? Abort on first error)
       │ (Passed)
       ▼
[Ready for Commit Approval]
```

1. **Level 1: Static Checks (`deno check`, `deno lint`, i18n parity)**
   - Type-checks modified TypeScript files (or `levain.ts` when entrypoint files change).
   - Runs `deno lint` on modified TypeScript files.
   - Validates `src/locales/en/translation.json` and `src/locales/pt/translation.json` for key parity, placeholder consistency (`{{var}}`), and malformed syntax.
2. **Level 2: Targeted Unit Tests**
   - Maps modified source files (e.g. `foo.ts`) directly to their sibling test counterparts (`foo.test.ts`).
   - Runs only affected test files first so regressions fail quickly.
3. **Level 3: Full Parallel Test Suite**
   - Executes `deno test --allow-all --parallel --fail-fast`.
   - *Skipped in `--quick` mode (`deno task integrate:quick`).*
   - When run on Linux or macOS, prints a clear reminder that Windows-only tests were skipped and points to `deno task test:windows` (see `AGENTS.md` and `testing/WINDOWS.md`).

---

## Operational Workflow

### Step 1: Run Integration Checks
Run the cascaded integration runner:
```bash
deno task integrate
```
*(For rapid iterative development, use `deno task integrate:quick` to run Levels 1 and 2 only. For Windows-affecting changes from a non-Windows machine, also run `deno task test:windows` when the SSH test contract is configured.)*

- **If any check fails:** STOP IMMEDIATELY. Inspect the failure, fix the code, and re-run. Do NOT proceed to commit.

### Step 2: Formulate Commit & PR Details
Once checks pass, inspect git changes:
```bash
git status -s
git diff --stat
```
1. Draft a clear commit message in English following Conventional Commits:
   - Format: `<type>(<scope>): <short imperative subject>`
   - Allowed types: `feat`, `fix`, `test`, `refactor`, `perf`, `chore`, `docs`.
   - Allowed scopes: `action`, `cmd`, `config`, `repo`, `fs`, `os`, `cli`, `i18n`, `deps`, `workflow`, `testing`.
2. Prepare the PR title and summary (including verification checklist for Levels 1, 2, and 3, plus whether Windows tests ran).

### Step 3: Present for User Confirmation (Default: Commit + Push + PR)
Present the integrated proposal to the user:
1. List of staged/changed files.
2. Exact proposed commit message and PR summary.
3. Confirm that **Commit + Push + PR creation is the default path** (if the user wants commit-only, they can specify it during confirmation).

**NEVER run `git commit` or `git push` without prior user approval in Step 3.**

### Step 4: Execute Commit
Once approved, stage the relevant files and create the commit:
```bash
git add <files>
git commit -m "<conventional commit message>"
```

### Step 5: Push & Create Pull Request (Default Path)
Unless the user explicitly opted out in Step 3:
1. **Push to Remote:**
   ```bash
   git push -u origin <current-branch>
   ```
2. **Create the Pull Request targeting `master`:**
   - When working in a personal fork, target the upstream repository with `head: "<username>:<branch>"` and `base: "master"`.
   - Use `gh pr create` when authenticated, or the GitHub REST API (`POST https://api.github.com/repos/{owner}/{repo}/pulls`).
   - Return the live PR URL to the user.
