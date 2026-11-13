---
name: levain-integrate
description: Run smart fast-fail checks (deno check, targeted tests, full test suite), enforce conventional commit approval, push to remote, and guide Merge Request (MR/PR) creation in the Levain repository.
---

# Levain Integration & Pre-Commit Protocol

Use this skill when you finish making code changes, before proposing or creating any git commits, or when the user asks to integrate, verify, push, and open an MR for the codebase.

## Goals
1. Minimize CPU and token usage via a 3-level fast-fail cascade.
2. Prevent regressions and ensure tests pass cleanly on Windows / Deno 2.
3. Enforce Conventional Commits in English.
4. **Human-in-the-Loop:** Always obtain explicit user approval before committing or pushing.
5. Provide a streamlined path from integration checks to Push and Merge Request (MR/PR).

---

## ⚡ The 3-Level Fast-Fail Cascade

The integration runner ([`scripts/integrate.ts`](file:///C:/Users/Dev/Documents/levain/scripts/integrate.ts)) automatically inspects `git status` and executes checks in ascending order of cost:

```
[Git Diff Analysis]
       │
       ▼
[Level 1: Static Type Check (<1.5s)] ───► (Failed? ❌ Abort immediately)
       │ (Passed ✔)
       ▼
[Level 2: Targeted Unit Tests (~3s)]  ───► (Failed? ❌ Abort immediately)
       │ (Passed ✔)
       ▼
[Level 3: Full Parallel Suite (~1m)]  ───► (Failed? ❌ Abort on first error)
       │ (Passed ✔)
       ▼
[Ready for Commit Approval]
```

1. **Level 1: Static Type Check (`deno check`)** (< 1.5s)
   - Checks only modified TypeScript files (or `levain.ts` if core files changed).
   - Aborts instantly on any compilation or type error, saving CPU from running tests on broken code.
2. **Level 2: Targeted Unit Tests** (~2 to 4s)
   - Maps modified source files (e.g. `foo.ts`) directly to their test counterparts (`foo.test.ts`).
   - Runs only affected test files. If the developer's immediate changes broke direct tests, execution stops here before running the full suite.
3. **Level 3: Full Parallel Test Suite** (~1 to 2m)
   - Executes `deno test --allow-all --parallel --fail-fast`.
   - Distributes tests across CPU cores on Windows and halts on the first error.
   - *Skipped in `--quick` mode (`deno task integrate:quick`).*

---

## Operational Workflow

### Step 1: Run Integration Checks
Run the cascaded integration runner:
```bash
deno task integrate
```
*(For rapid iterative development, use `deno task integrate:quick` to run only Levels 1 and 2).*

- **If any check fails:** STOP IMMEDIATELY. Inspect the failure, correct the code, and re-run. Do NOT proceed to commit.

### Step 2: Formulate Commit & PR Details
Once all checks pass (Exit Code 0), inspect git changes:
```bash
git status -s
git diff --stat
```
1. Draft a clear commit message in English following Conventional Commits:
   - Format: `<type>(<scope>): <short imperative subject>`
   - Allowed types: `feat`, `fix`, `test`, `refactor`, `perf`, `chore`, `docs`.
   - Allowed scopes: `action`, `cmd`, `config`, `repo`, `fs`, `os`, `cli`, `i18n`, `deps`, `workflow`.
2. Prepare the PR/MR title and summary (including verification checklist of Level 1, 2, and 3).

### Step 3: Present for User Confirmation (Default: Commit + Push + PR)
Present the integrated proposal to the user:
1. List of staged/changed files.
2. The exact proposed commit message and PR summary.
3. Inform the user that **Commit + Push + PR creation is the default standard path**.
   - If the user simply approves (e.g. "pode", "aprovo", "sim"), proceed through Steps 4 and 5.
   - If the user wants to commit only without push or PR, they will specify it in their response (e.g. "somente commit", "não faça push").

**NEVER run `git commit` or `git push` without prior user approval in Step 3.**

### Step 4: Execute Commit
Once approved, stage the relevant files and create the commit:
```bash
git add <files>
git commit -m "<conventional commit message>"
```

### Step 5: Push & Create Pull Request / Merge Request (Default Path)
Unless the user explicitly opted out in Step 3, complete the integration:
1. **Push to Remote:**
   ```bash
   git push -u origin <current-branch>
   ```
2. **Create the Pull Request / Merge Request:**
   - **Direct REST API (Zero external tool requirement):** The assistant can create the PR directly via GitHub/GitLab REST API (`POST https://api.github.com/repos/{owner}/{repo}/pulls` or GitLab API) using repository credentials/tokens. CLI tools like `gh` are **not** required.
   - **CLI Tools (Optional):** If `gh` or `glab` is installed and authenticated, `gh pr create` can also be used.
   - **Interactive Result:** Always return the final PR/MR link (e.g. `https://github.com/<owner>/<repo>/pull/<id>`) to the user.
