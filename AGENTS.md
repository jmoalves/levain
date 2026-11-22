# AGENTS.md — Repository Guidelines for AI Assistants

This file is the **single source of truth** for all AI coding assistants (Antigravity, Claude Code, GitHub Copilot, OpenAI Codex, Cursor) and contributors working in this repository. (`CLAUDE.md` imports this file via `@AGENTS.md`.)

---

## What This Is

Levain is a Deno/TypeScript CLI that installs and configures development environments on **Windows** from declarative YAML recipes (`*.levain.yaml`). It ships as a single compiled `levain.exe` (target `x86_64-pc-windows-msvc`) wrapped by `levain.cmd`, `levain.ps1`, and `levain.sh`.

**Sibling project:** [`jmoalves/levain-pkgs`](https://github.com/jmoalves/levain-pkgs) holds the actual installation recipes (jdk, git, eclipse, wlp, …). This repository ships only the engine plus the `levain` recipe itself in `recipes/`. `install/install.ps1` defaults to `--addRepo https://github.com/jmoalves/levain-pkgs.git`, and users can point elsewhere with `$levainRepo`. Recipe-format changes made here must stay compatible with what `levain-pkgs` publishes — bump `version` in `recipes/levain.levain.yaml` and use `levain.minVersion` in a recipe when it requires a newer engine.

---

## Branching & Release Model

* **`master`** is the active **v1 / Deno 2** codebase (JSR/npm specifiers in `deno.json`, no `import_map.json`). v1 is currently stabilizing through pre-releases (`v1.0.x`) before replacing v0 as `Latest`.
* **`v0.x`** is the maintenance branch for legacy **v0 / Deno 1.46.3** hotfixes while `v0.93.1` remains the `Latest` release.
* **`deno2_opus`** is obsolete (kept temporarily on `origin` so in-flight contributor forks are not broken). **All new work and PRs must target `master`** from short-lived thematic branches (`chore/...`, `feat/...`, `fix/...`, `test/...`, `perf/...`).
* See [`ROADMAP.md`](ROADMAP.md) for the active housekeeping and stabilization plan.

---

## Pre-Commit & Integration Protocol

This protocol is also encapsulated as an agent skill at [`.agents/skills/levain-integrate/SKILL.md`](.agents/skills/levain-integrate/SKILL.md).

Before creating a commit, proposing a Pull Request, or concluding any code task:

1. **Run local integration checks:**
   ```bash
   deno task integrate
   ```
   *(Or `deno task integrate:quick` during fast iteration to run Level 1 checks and targeted unit tests only.)*
2. **Never commit if checks fail:** fix any type, lint, i18n, or test failure first.
3. **Formulate a Conventional Commit message in English:**
   * Format: `<type>(<scope>): <short imperative subject>`
   * Allowed types: `feat`, `fix`, `test`, `refactor`, `perf`, `chore`, `docs`.
   * Allowed scopes: `action`, `cmd`, `config`, `repo`, `fs`, `os`, `cli`, `i18n`, `deps`, `workflow`, `testing`.
4. **Human-in-the-Loop Rule:**
   * **NEVER** run `git commit` or `git push` without explicit user approval.
   * Present the changed files, validation summary, and proposed commit message/PR summary to the user first.
   * **Default path:** approving the proposal authorizes `git commit` + `git push` + PR creation targeting `master` (unless the user explicitly opts for commit-only).
5. **Push & Pull Request:**
   * Push to `origin` (`git push -u origin <branch>`).
   * Open the PR targeting `master` on the upstream repository (using `gh` or the GitHub REST API) and return the live PR URL.

---

## Windows Testing Scenarios (CI, SSH, Sandbox & Local)

Almost everything meaningful in Levain is **Windows-only**. `OsUtils.onlyInWindows()` throws on other platforms, and Windows-specific tests are guarded with `if (OsUtils.isWindows())` — so a green test run on Linux/macOS silently skips large parts of the suite.

Four distinct scenarios exist — they are **not equivalent** (see the full comparison matrix and workflow in [`testing/WINDOWS.md`](testing/WINDOWS.md)):

1. **GitHub Actions (`windows-latest`):** authoritative CI gate (`test-unit.yml`, `checkSources.yml`, `test-e2e.yml`), clean Windows Server (`en-US`), runs Codecov and full `levain-pkgs` E2E.
2. **Preferred for real client validation & agents — Remote Windows Machine Over SSH (`deno task test:windows`):**
   * Contract: two environment variables supplied externally (outside this repository):
     * **`LEVAIN_TEST_SSH_CONFIG`**: path to an `ssh_config` file that knows how to reach the Windows machine.
     * **`LEVAIN_TEST_HOST`**: host name defined inside that `ssh_config`.
   * **Transport:** use **only** `ssh -F "$LEVAIN_TEST_SSH_CONFIG" "$LEVAIN_TEST_HOST" ...`, and pass the same `-F "$LEVAIN_TEST_SSH_CONFIG"` to `scp` (or `rsync -e "ssh -F \"$LEVAIN_TEST_SSH_CONFIG\""`).
   * **Remote environment:** **`cmd.exe`** login shell (not PowerShell or bash), **administrator** user, Windows Defender enabled, `pt-BR` recommended, nothing from Levain pre-installed (bootstrapping `Deno`, `extra-bin`/bundled `git`, and source transfer are handled by the runner). Preferred target is a **disposable clean machine** per run, though an existing Windows machine also works via isolated temporary directories.
   * **Missing-contract behavior:** if either variable is unset (or the config file does not exist), `deno task test:windows` **must skip explicitly (exit 0)** with a clear message explaining what is missing and where the contract is documented — never fail or try to discover a machine on its own.
   * **Public repository rule:** provisioning, starting/stopping, and hosting live outside this repository. Never commit machine names, cloud accounts, local paths, or network addresses — refer only generically to "a Windows machine reachable over SSH".
3. **Windows Sandbox (`WindowsSandbox.exe`, Windows 10/11 Pro/Enterprise only):** fast zero-state isolation for Registry/`PATH`/profile without managing a VM, but does **not** reproduce real host Windows Defender behavior.
4. **Local Windows Machine:** fast inner-loop development (`deno task integrate`, `deno task test`, `deno task test:windows -- --local`, `scripts\test.cmd`). Mutates `HKCU`, user `PATH`, Desktop, and Start Menu (using a disposable local user account isolates `HKCU` but still shares `HKLM`, global tools, and Defender exclusions).

---

## Primary Development Commands

Deno tasks and commands (work anywhere):

```bash
deno task integrate                                    # cascaded checks: typecheck + lint + i18n -> targeted -> full suite
deno task integrate:quick                              # fast iteration: skips full suite
deno task check:i18n                                   # validate en/pt i18n catalog parity & placeholders
deno task test:windows                                 # run suite on remote Windows host via SSH contract (skips if unset)
deno task test:windows -- --filter "Registry"          # pass extra deno test flags to remote Windows run
deno task test                                         # deno test --allow-all
deno test --allow-all --parallel                       # all tests in parallel
deno test --allow-all src/action/os/copy.test.ts       # single test file
deno test --allow-all --filter "should show a text"    # single test by name
deno check levain.ts                                   # typecheck
deno lint                                              # lint (config in deno.json)
```

Windows `.cmd` scripts in `scripts/` (use `<repo>/bin/deno.exe` set up by `scripts\devLevain.cmd`):

```cmd
scripts\devLevain.cmd            :: one-time dev setup: bin\deno.exe + extra-bin + cache
scripts\test.cmd                 :: run tests on Windows
scripts\check-sources.cmd        :: deno check levain.ts + deno test --no-run with clean DENO_DIR
scripts\levain-deno.cmd list     :: run Levain from source
scripts\testWatch.cmd            :: watch mode
```

**Formatting:** `deno.json` specifies 2-space indentation, double quotes, semicolons, and 120-char line width (matching the v1 codebase). Avoid running repo-wide `deno fmt` inside unrelated PRs so diffs stay focused on the files you changed.

---

## Architecture

Execution path: `levain.ts` (logging setup, global arg parsing) → `src/levain_cli.ts` (version check, `Config`, repository init, self-upgrade) → `Loader` → command or action.

**Two pluggable extension points (registry-map factories):**

* **Commands** (`src/cmd/`, `CommandFactory`): user-facing verbs — `install`, `shell`, `activate`, `_activate-machine`, `list`, `clean`, `actions`, `info`, `explain`, `clone`, `update`. Implement `Command` (`oneLineExample` + `execute(args)`).
* **Actions** (`src/action/`, `ActionFactory`): verbs recipes use in `cmd.install` / `cmd.env` lines — `copy`, `addPath`, `setEnv`, `extract`, `template`, `contextMenu`, `jsonSet`, `mavenCopy`, `activateInit`, etc. Implement `Action` (`execute(pkg, parameters)`).

`Loader.action()` splits a recipe line into action name + args, applies `handleQuotes`, then resolves `${...}` variables through `Config.replaceVars` → `VarResolver` **before** handing args to the action. Actions parse flags with `parseArgs` from `src/lib/parse_args.ts`.

**Repositories** (`src/lib/repository/`) resolve recipe names to packages:
* Git URL → `GitRepository`
* `*.zip` → `ZipRepository`
* Otherwise → `FileSystemRepository`
Composed via `ChainRepository` across installed (`registry`), regular (`recipes/` + `--addRepo` + `--tempRepo`), and current directory (`currentDir`).

**Paths & extra-bin** (`src/lib/paths/`): `LevainPaths`, `ConfigPaths`, `HomePaths`, `GeneralPaths`, and `ExtraBin` (`src/lib/paths/extra_bin.ts`) centralize path resolution and break circular imports. `ExtraBin` points at bundled Windows tools (`7-Zip`, `git`, `os-utils`) under `extra-bin/windows/`.

**Config** (`src/lib/config.ts`) is threaded through every command and action, owning base dirs, user credentials, and config persistence (`$HOME/levain.config.json`, with legacy fallback).

**Version** is read at runtime from `recipes/levain.levain.yaml` (`LevainVersion.levainVersion`).

**Compiled vs. source:** `LevainPaths.levainRootFile` branches on `--is_compiled_binary`, baked into the binary by `githubScripts/levain-build.sh` and `scripts/levain-build.cmd`. Keep those in sync when changing bootstrap/path resolution.

---

## Language & i18n Policy

* Everything in this repository — code, identifiers, comments, documentation, and commit messages — is written in **English**.
* All user-facing strings must go through `t("key")` from `src/lib/i18n.ts`, backed by **both** `src/locales/en/translation.json` and `src/locales/pt/translation.json`.
* Adding or updating a user-facing message requires updating **both** JSON catalogs with identical keys and `{{placeholder}}` names (verified automatically by `deno task integrate`).

---

## Testing Conventions

Tests live next to the code as `*.test.ts` and use `Deno.test` with `@std/assert`. Shared helpers in `src/lib/test/`:

* `TestHelper` — `getConfig()`, `mockPackage()`, `getTestDataPath(...)`, `getNewTempDir()`, `setupTestLogger()`.
* `more_asserts.ts` — `assertFind`, `assertFolderIncludes`, `assertPathEndsWith`, `assertDirCount`.
* `levain_asserts.ts` — package-list assertions.
* `MockPackage`, `MockRepository`, `PackageManagerMock` for test doubles.
* Fixtures live in `testdata/<feature>/`.
