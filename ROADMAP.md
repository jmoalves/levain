# Levain v1 Housekeeping & Stabilization Roadmap

This roadmap tracks the engineering work to stabilize **Levain v1 (Deno 2)** on `master`, simplify long-term maintenance, and keep the codebase easy to hand over or adopt.

While v1 is being hardened and validated, `v0.93.1` remains the `Latest` release (with `v0.x` available for legacy hotfixes) and `v1.0.x` builds stay published as pre-releases.

---

## Status Overview

| Stage | Branch / Scope | Goal | Status |
| :--- | :--- | :--- | :--- |
| **Stage 0** | `v0.x`, `master` | Freeze Deno 1 on `v0.x`, promote `deno2_opus` to `master`, keep `deno2_opus` untouched as obsolete | Done |
| **Phase 1** | `chore/governance-and-agents` | Unified AI/contributor guidelines, generic Windows SSH testing contract, i18n/lint validation | Done |
| **Phase 2** | `chore/ci-and-build` | Fix `scripts/test.cmd` & coverage reporting, align Deno versions in CI, clean build/release scripts, document all 4 Windows testing scenarios | Done |
| **Phase 3** | `chore/security-hardening` | Remove `curl -k`, enable `deno.lock`, pin GitHub Actions & permissions, audit embedded binaries and runtime | Done |
| **Phase 3.5** | `chore/review-subagents` | Portable read-only review subagents (`business-qa`, `technical-qa`, `security`, `performance`, `usability`) for Antigravity & Claude Code | Done |
| **Phase 3.6** | `fix/v1-blockers` | Close P0 security, privacy, exit-code, E2E, i18n, and runtime bugs surfaced by the 5-lens whole-repo review | Done |
| **Phase 4** | `test/coverage-and-reliability` | Real coverage baseline, 100% actions × options contract recipes, unit tests for all commands, core modules, and `src/lib/io/` | Planned |
| **Phase 4.5** | `refactor/core-cli-and-actions` | Fix incomplete commands, `levain.minVersion`, `levainShell`, `parse_args.ts`, broken actions, "did you mean?", and CLI/activate UX | Planned |
| **Phase 5** | `perf/startup-and-repos` | Measure & optimize startup/repos/CI, pragmatically reduce `extra-bin` toward pure Deno, macOS/Linux foundation, and v1 production readiness | Planned |

---

## Stage 0 — Branch Reorganization (Completed)

- [x] Create `v0.x` from the legacy Deno 1 `master` (`eacb477`) for hotfixes while v1 stabilizes.
- [x] Merge `deno2_opus` cleanly into `master` (`dcc7161`) without rewriting history.
- [x] Keep `deno2_opus` untouched on `origin` as obsolete so in-flight contributor forks are not disrupted.
- [x] Keep `v0.93.1` as `Latest` and `v1.0.1` as `Pre-release`.

---

## Phase 1 — Governance, Agent Tooling & Windows Testing Contract (Completed)

**Branch:** `chore/governance-and-agents`

- [x] Make [`AGENTS.md`](AGENTS.md) the single source of truth for all AI assistants and contributors, with [`CLAUDE.md`](CLAUDE.md) importing it (`@AGENTS.md`).
- [x] Document and implement the generic Windows SSH testing contract (`LEVAIN_TEST_SSH_CONFIG` + `LEVAIN_TEST_HOST`, explicit skip when unset, support for both remote Windows and local execution) in [`testing/WINDOWS.md`](testing/WINDOWS.md) and [`testing/run-windows-tests.ts`](testing/run-windows-tests.ts).
- [x] Remove host-specific VM provisioning scripts/docs from the repository.
- [x] Remove hardcoded local paths from [`.agents/skills/levain-integrate/SKILL.md`](.agents/skills/levain-integrate/SKILL.md) and target PRs to `master`.
- [x] Enhance [`scripts/integrate.ts`](scripts/integrate.ts) with `deno lint`, automatic i18n key/placeholder parity checks (`en` vs `pt`), and a clear non-Windows platform warning.
- [x] Fix broken placeholders/keys in `src/locales/{en,pt}/translation.json`.
- [x] Update [`README.md`](README.md) to reflect the `master` (v1) vs `v0.x` branch structure and link to this roadmap.

---

## Phase 2 — GitHub Actions, Build & Release Process (Completed)

**Branch:** `chore/ci-and-build`

- [x] Restore full functionality in `scripts/test.cmd` (`--denoDir`, `--coverage` generating `coverage/levain.lcov` for Codecov, `--checkSources`, `--parallel`, argument pass-through).
- [x] Align default Deno version (`2.9.8`) across `.github/workflows/test-unit.yml`, `checkSources.yml` (fixing missing default on `schedule`), and `release.yml`.
- [x] Add `deno lint` and `deno task check:i18n` checks to CI (`test-unit.yml` and `githubScripts/levain-check.sh`).
- [x] Fix `scripts/levain-build.cmd` (`--denoDir` now honored during `deno compile`) and align `compile*` (`--is_compiled_binary`), `test.include` (include root `levain.test.ts`), `lint.include`, and Deno 2 `fmt` format in `deno.json`.
- [x] Parameterize repository owner/name (`GITHUB_REPOSITORY` / `LEVAIN_REPOSITORY`) in `githubScripts/` and `scripts/devLevain.cmd`, and remove dead/broken legacy scripts (`asset-upload.sh`, `clean-levain-release.sh`, `get-levain-release.sh`, `levain-bundle.sh`, `scripts/antigos/testAll.cmd`, `scripts/bundle.*`).
- [x] Standardize the `-SNAPSHOT` version convention in `recipes/levain.levain.yaml` (`1.0.2-SNAPSHOT`).
- [x] Add a lightweight `static-checks` Linux CI job in `test-unit.yml` alongside `unit-win`.
- [x] Consolidate all 4 Windows testing scenarios (GitHub Actions, SSH contract, Windows Sandbox, local Windows) in `testing/WINDOWS.md` and `AGENTS.md`.

---

## Phase 3 — Security & Supply Chain Hardening (Completed)

**Branch:** `chore/security-hardening`

- [x] Remove insecure `curl -k` flags across `githubScripts/` (`github-get-release.sh`, `tag-release.sh`, `levain-embedded-binaries.sh`), switching to `-fsSL` and `Authorization: Bearer` headers.
- [x] Enable and commit `deno.lock` (`--frozen` in CI, checks, and build scripts).
- [x] Remove unused `@webui/deno-webui` from root `deno.json` (isolated in `inception/webui/deno.json`).
- [x] Declare explicit least-privilege `permissions:` blocks in all workflows, pin third-party GitHub Actions to commit SHAs, and add `.github/dependabot.yml` for `github-actions`.
- [x] Verify GitHub Release SHA-256 digests (`assets[].digest`) for all downloaded binaries (`7-Zip` Linux tool, `MinGit`, `7-Zip` Windows) in `githubScripts/levain-embedded-binaries.sh`.
- [x] Audit runtime credential/shell handling (fixed multi-occurrence password leak in `LogUtils.hidePassword` with unit test) and add `SECURITY.md`.

---

## Phase 3.5 — Portable Review Subagents (Completed)

**Branch:** `chore/review-subagents`

- [x] Define 5 read-only review lenses (`business-qa`, `technical-qa`, `security`, `performance`, `usability`) in `.agents/agents/` as the single source of truth for Antigravity, with clear boundaries and PR + whole-repo review modes.
- [x] Add thin read-only Claude Code wrappers in `.claude/agents/` referencing `.agents/agents/`.
- [x] Document lens boundaries, priority order, and invocation guidance in `AGENTS.md`.

---

## Phase 3.6 — v1 Blockers & High-Risk Security/Correctness Fixes (Completed)

**Branches:** `fix/security-and-privacy-blockers`, `fix/exit-codes-and-runtime-blockers` *(from the 5-lens whole-repository audit)*

- [x] Fix runtime password masking in logs (`LogFormatterFactory` capturing `ConsoleAndFileLogger.config` before initialization, `template.ts` logging full rendered content / raw replacements, unmasked `ConsoleFeedback`, JSON-escaped passwords in `LogUtils.hidePassword`).
- [x] Replace hardcoded internal organization URLs and Maven coordinates in public tests/source (`src/lib/utils/git_utils.test.ts`, `src/action/maven/maven_copy*.ts`, `extra-bin/windows/os-utils/mavenCopy.cmd`) with generic `example.org` / `com.example` fixtures.
- [x] Propagate non-zero exit codes on errors across `levain.ts`, `src/levain_cli.ts`, `levain.{cmd,ps1,sh}`, and `install/install.ps1`, and fix the missing space in `.github/workflows/test-e2e.yml` (`set "pkgList=!pkgList! %%a"`).
- [x] Verify release `.sha256` checksums on a private copy during self-upgrade (`src/lib/releases/levain_releases.ts`), write `upgrade-target.txt`, and harden `%TEMP%\levain` extraction/handling in `levain.cmd`.
- [x] Fix high-impact runtime and security bugs:
  - Disable HTML entity escaping in `src/lib/i18n.ts` (`interpolation: { escapeValue: false }`).
  - Fix array-reference comparison in `OsUtils.sanitizeUserPath()` (avoiding unnecessary `powershell.exe` / Registry writes on every Windows command).
  - Check `response.ok` in `HttpReader` and fix `FileCache` stream leak / double HTTP `GET`.
  - Add Zip Slip path-containment validation and disable Web Workers in `DenoZip` (`src/lib/extract/denozip_extractor.ts`).
  - Move `${{ github.* }}` expressions out of inline `run:` scripts into step `env:` across `.github/workflows/` and harden `testing/run-windows-tests.ts` argument quoting.
  - Guard `VarResolver.replaceVars` against recursion cycles (including package YAML vars) and `$&`/`$$` replacement corruption, fix `FileUtils.createBackup` collision loop, fix `LevainReleases` 404 fallthrough, and fix the stray backtick in `README.md`.

---

## Phase 4 — Test Coverage & Suite Reliability

**Branch:** `test/coverage-and-reliability`

- [ ] Establish a real coverage baseline on Windows now that `coverage/levain.lcov` reporting is restored.
- [ ] Fix resource/timer leaks (`DenoZip` Web Workers, `Extractor` interval, `HttpUtils` timeout, `src/lib/io/*` error handling) and re-enable sanitizers in `extract.test.ts`.
- [ ] Eliminate host-OS mutation, parallel races, and live GitHub/Maven calls in unit tests (isolate `TestHelper.getConfig()`, use local `git init --bare` fixtures, restore `chmod`/shortcuts/`PATH`, fix cross-platform path assertions).
- [ ] Build a **contract recipe suite** (synthetic test recipes) covering **100% of implemented actions and 100% of their implemented options** — protecting both `levain-pkgs` and richer external/private recipe catalogs.
- [ ] Add unit tests for **all Levain commands** in `src/cmd/` (`command_factory`, `install`, `update`, `list_command`, `info`, `explain`, `activate`, `activate_machine`, `clone`, `shell`, `actions`, alongside `clean`) and `levain.minVersion` enforcement.
- [ ] Add unit tests for core runtime modules (`src/levain_cli.ts`, `src/lib/loader.ts`, `src/lib/i18n.ts`, `src/lib/paths/*`) and the `src/lib/io/` layer.
- [ ] Add unit tests for uncovered actions (`backup_file`, `os/mkdir`, `json_remove`, `levainShell`, `activate/*`, `check_port`, `check_url`, `inspect`, `context_menu*`, `killProcess`).

---

## Phase 4.5 — Core Commands, Actions & CLI Ergonomics Overhaul

**Branch(es):** `refactor/parse-args`, `fix/levain-shell-and-actions`, `fix/commands-and-activate`, `feat/did-you-mean-and-cli-ux` *(split into focused PRs)*

- [ ] Replace/harden the **homegrown action option parser** (`src/lib/parse_args.ts` + `Loader.action`): migrate `@std/flags` → `@std/cli/parse-args`, fix global `stopEarly`, `checkStringOnce` (`--opt=val`, duplicates), and `handleQuotes` with a single-pass tokenizer and unit tests.
- [ ] Fix **serious limitations in `levainShell` and `OsShell`** (`src/action/levainShell.ts`, `src/lib/os/os_shell.ts`): stop mutating `cmd.shell` and `addpath.path` in place, fix `cmd /u /c` UTF-16LE vs UTF-8 decoding and `stderr` visibility, fix quoting / `shellPath` spaces, and fix `currentDir` resolution.
- [ ] Fix **broken or half-implemented actions** (`jsonRemove`, `killProcess`, `checkPort` `"udp"` typo, `mavenCopy` `--ifNotExists`, `propertyGet` `--default` & `PropertiesUtils`, `copy --ifNotExists`/`--strip`, `template`/`inspect` regex flags, `setEnv --permanent` spaces, `removeFromRegistry`, `contextMenu`, `echo`, `checkChainDirExists`) and shell/command injection vectors (`UnTar`, `GitUtils.clone`, `ActivateCmd`, initializers).
- [ ] Audit and fix **incomplete or divergent commands** in `src/cmd/`: deduplicate `install`/`update` with safe rollback, make `levain.minVersion` fail/abort properly across commands, fix `activate`/`_activate-machine` onboarding (PowerShell initializer in `recipes/levain.levain.yaml`, `activate_init` defaults, `CmderInitializer` `await`, `levain.{cmd,ps1,sh}` parity), fix `clean`/`explain`/`info`/`list`/`clone`, and remove random auto-`clean` from `_activate-machine`/read-only commands.
- [ ] Improve **typo suggestions ("did you mean?")** and **CLI/i18n UX**: Damerau-Levenshtein sorted/capped suggestions across commands, options, actions, and packages; add `--help`/`--version`; remove blocking `Hit ENTER` on CLI errors; fix `Config.configHome` dead code, `promptSecret` (POSIX/non-TTY), headless pass-through, and `en`/`pt` i18n catalog defects.

---

## Phase 5 — Performance, `extra-bin` Reduction, Cross-Platform & v1 Readiness

**Branch(es):** `perf/startup-and-repos`, `feat/pure-deno-and-cross-platform` *(split as needed)*

- [ ] **CI & build script hardening:** add `DENO_DIR` caching, remove redundant `--reload` flags, add `set -euo pipefail` and proper quoting across `githubScripts/*.sh` and `scripts/*.cmd`, and align `7-Zip` directory casing.
- [ ] **Measure and optimize CLI startup, repository crawling & I/O:** instrument startup phases, add TTL caching / parallelization for `checkLevainUpdate` and `GitRepository`, avoid redundant YAML parsing in `FileSystemRepository`/`FileSystemPackage`, throttle `ConsoleFeedback` and `AutoFlushLogFileHandler`, use `moveSync` in `savePreviousInstall`, benchmark binary size, and trim unneeded dependencies (`date-fns`, `validator`, lazy command/action loading).
- [ ] **Pragmatically reduce `extra-bin` dependency toward pure Deno:** gradually absorb `extra-bin/windows/os-utils/` scripts into TypeScript/Deno (reducing PowerShell/VBS spawns and Defender false-positive surface), prefer pure-Deno/native extraction for `.zip`/`.tar.gz`, and keep `7-Zip` (`.7z`/SFX) and `MinGit` (Windows fallback when system `git` is absent) only where genuinely justified.
- [ ] **Cross-platform foundation (macOS & Linux):** align with Levain's original multi-OS intent (`levain.sh`, `OsShell`, `UnTar`, `GitUtils`, `OsUtils.createShortcut`, `LevainReleases`, OS guards in `recipes/levain.levain.yaml`, pure `ConfigPaths` getters) without regressing Windows stability.
- [ ] **Validate v1 pre-releases end-to-end:**
  - Run `Test - e2e` workflow against the latest `v1.0.x` pre-release (after fixing `test-e2e.yml` and exit codes).
  - Validate on a clean Windows machine over SSH (`deno task test:windows`) with Windows Defender active and `pt-BR` locale, including `levain activate`.
- [ ] **Handover readiness:** remove remaining hardcoded `jmoalves/levain` references (`LevainReleases`), replace raw string throws with `Error`, clean non-English code comments, and write a concise maintenance and ownership handover guide (`CONTRIBUTING.md` / `docs/MAINTAINING.md`).
