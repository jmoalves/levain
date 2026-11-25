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
| **Phase 4** | `test/coverage-and-reliability` | Real coverage baseline, 100% actions × options contract recipes, unit tests for all commands, core modules, and `src/lib/io/` | Done |
| **Phase 4.5** | `refactor/core-cli-and-actions` | Fix incomplete commands, `levain.minVersion`, `levainShell`, `parse_args.ts`, broken actions, "did you mean?", and CLI/activate UX | Done |
| **Phase 5** | `chore/ci-and-branch-governance`, `perf/...`, `feat/...`, `docs/...` | Protect `master` (PR-only), harden CI/build, measure & optimize startup/repos/I/O, reduce `extra-bin`, cross-platform & multi-instance concurrency, redesign `explain`, overhaul docs/README, triage issues, and ship `v1.1.0` | In Progress |

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

## Phase 4 — Test Coverage & Suite Reliability (Completed)

**Branches:** `test/suite-reliability-and-isolation`, `test/commands-and-core-coverage`, `test/action-contracts-100pct` *(split into 3 incremental PRs)*

- [x] Establish a real coverage baseline on Windows now that `coverage/levain.lcov` reporting is restored (`66.03%` after Phase 3.6; add `.codecov.yml` tolerance against sub-0.5% non-deterministic project drift).
- [x] Fix resource/timer leaks (`DenoZip` Web Workers, `Extractor` interval, `HttpUtils` timeout, `CheckUrl` body cancel, `src/lib/io/*` error handling) and re-enable sanitizers in `extract.test.ts`.
- [x] Eliminate host-OS mutation, parallel races, and live GitHub calls in unit tests (isolate `TestHelper.getConfig()`, use local `git init --bare` fixtures, restore `chmod`/shortcuts/`PATH`, fix cross-platform path assertions).
- [x] Build a **contract recipe suite** (`testdata/contracts/*.levain.yaml` + `test/action_contracts.test.ts`) covering **100% of implemented actions and 100% of their implemented options** with an automatic completeness guard — protecting both `levain-pkgs` and richer external/private recipe catalogs.
- [x] Add unit tests for **all Levain commands** in `src/cmd/` (`command_factory`, `install`, `update`, `list_command`, `info`, `explain`, `activate`, `activate_machine`, `clone`, `shell`, `actions`, alongside `clean`) and `levain.minVersion` enforcement.
- [x] Add unit tests for core runtime modules (`src/levain_cli.ts`, `src/lib/loader.ts`, `src/lib/i18n.ts`, `src/lib/paths/*`, `src/lib/cli_util.ts`, `src/lib/timer.ts`, `src/lib/utils/error_utils.ts`, `src/lib/extract/extractor_factory.ts`) and the `src/lib/io/` layer.
- [x] Add unit tests for uncovered actions (`backup_file`, `os/mkdir`, `json_remove`, `levainShell`, `activate/*`, `check_port`, `check_url`, `inspect`, `context_menu*`, `killProcess`, `defaultPackage`, `noop`, `shell_path`).

---

## Phase 4.5 — Core Commands, Actions & CLI Ergonomics Overhaul

**Branch(es):** `refactor/parse-args-and-upgrade-deps`, `fix/levain-shell-and-actions`, `fix/commands-and-activate`, `feat/did-you-mean-and-cli-ux` *(split into focused PRs)*

- [x] Replace/harden the **homegrown action option parser** (`src/lib/parse_args.ts` + `Loader.action`) and **upgrade dependencies**: migrate `@std/flags` → `@std/cli/parse-args`, upgrade JSR/npm dependencies to latest with aligned Deno `2.9.8` lockfile, remove legacy `"@std/"`/`"std/"` import aliases, make `stopEarly` configurable (preserving positional `--`-prefixed values for `setEnv`/`levainShell` while enabling flags after positionals in CLI commands/safe actions), replace manual `checkStringOnce` with `@std/cli/parse-args` collection, and replace `split(" ")` + `handleQuotes` with a single-pass `tokenizeArgs` preserving Windows backslashes and intentional whitespace.
- [x] Fix **serious limitations in `levainShell` and `OsShell`** (`src/action/levainShell.ts`, `src/lib/os/os_shell.ts`): stop mutating `cmd.shell` and `addpath.path` in place, replace `cmd /u /c` with `cmd /d /c`, surface `stderr` on `--saveVar` failures, and fix `shellPath` spaces in interactive `start`.
- [x] Eliminate the **password special-characters prohibition** (`forbiddenPasswordChars` in `UserInfoUtil` and its prompt warning) solely inside Levain: pass secrets safely to child shells in `OsShell`/`levainShell` via ephemeral environment variables (`cmd /s /d /v:on /c` delayed expansion `"!__LEVAIN_SECRET_N!"`), migrate `askPassword` to `@cliffy/prompt` `Secret.prompt` (and fix multi-byte UTF-8 / `\u007f` / `try-finally` in `promptSecret`), fix `$&`/`$$` replacement callbacks and multi-flag regexes in `template.ts`, and add variable filter syntax `${var | urlEncode}` (RFC 3986) in `VarResolver` + `tokenizeArgs` — with `LogUtils.hidePassword` masking raw, JSON-escaped, and URL-encoded forms.
- [x] Fix **broken or half-implemented actions** (`jsonRemove`, `killProcess`, `checkPort` `"udp"` typo, `mavenCopy` `--ifNotExists`, `propertyGet` `--default` & `PropertiesUtils`, `copy --ifNotExists`/`--strip`, `template`/`inspect` regex flags, `setEnv --permanent` spaces, `removeFromRegistry`, `contextMenu`, `echo`, `checkChainDirExists`) and shell/command injection vectors (`UnTar`, `SevenZip`, `GitUtils.clone`, `ActivateCmd`, initializers).
- [x] Audit and fix **incomplete or divergent commands** in `src/cmd/` and lifecycle infrastructure: deduplicate `install`/`update` (shared `retry`, non-mutating `cmd.install`, quoted paths), enforce strict `levain.minVersion` and `savePreviousInstall` failure handling, fix `activate`/`_activate-machine` onboarding (PowerShell initializer in `recipes/levain.levain.yaml`, `activateInit` platform defaults, `throw` instead of `Deno.exit`, `levain.{cmd,ps1,sh}` `--skip-pre` parity), fix `shell`/`clean`/`explain`/`info`/`list`/`actions`/`clone`, fix `Config.configHome` CLI precedence, fix `RepositoryManager.invalidatePackages()` missing `await` and `RepositoryFactory` per-`Config`/`rootOnly` cache isolation, and replace random `Math.random()` auto-`clean` with a deterministic daily `lastAutoClean` schedule (persisted in `levain.config.json`, restricted to mutating commands `install`/`update`/`shell`/`clone` with `--skip-auto-clean` opt-out).
- [x] Adopt **`@cliffy/command`** for top-level CLI routing (`--help`, `--version`, hidden `_activate-machine`, early command/flag validation before repo/release init), improve **typo suggestions ("did you mean?")** with Damerau-Levenshtein sorted/capped suggestions across commands/actions/packages, remove blocking `Hit ENTER` on CLI errors, pass headless flags in `install/install.ps1`, and fix `en`/`pt` i18n catalog defects.

---

## Phase 5 — Performance, `extra-bin` Reduction, Cross-Platform, Concurrency, Docs & `v1.1.0` Readiness

**Branch(es):** `chore/ci-and-branch-governance`, `perf/startup-and-repos`, `refactor/reduce-extra-bin`, `feat/cross-platform-and-concurrency`, `feat/explain-playbook-and-cli-docs`, `docs/handover-and-v1-1-readiness` *(incremental PRs)*

- [x] **Branch governance (`master` PR-only) & CI/build hardening:** prohibit direct commits/pushes to `master` via local `.githooks/{pre-commit,pre-push}` (`deno task setup:hooks`) + GitHub Ruleset on `master` (requiring PR + `static-checks` & `unit-win`), adapt `release.yml` / `tag-release.sh` / `push-release.sh` to push `release/vX.Y.Z` + tag and open an automatic version-bump PR instead of pushing directly to `master`, add `DENO_DIR` caching (`actions/cache`) across CI workflows, remove redundant `--reload` flags, add `set -euo pipefail`, SHA-256 verification, and safe quoting across `githubScripts/*.sh` and `scripts/*.cmd`, and align `7-zip` directory casing in `ExtraBin`.
- [x] **Measure and optimize CLI startup, repository crawling & I/O:** instrument startup phases (`LEVAIN_PROFILE=1` / debug timing), add daily `lastUpdateCheck` TTL and `_activate-machine cmd` bypass for `checkLevainUpdate`, add TTL caching (`LEVAIN_GIT_UPDATE_TTL_SECONDS`) for `GitRepository` and parallel repo init in `RepositoryManager`, make `FileSystemPackage.updateAvailable` lazy with raw-YAML fast path, fix `FileSystemRepository.excludeDirs` segment matching, throttle `ConsoleFeedback` and `AutoFlushLogFileHandler`, use `moveSync` (O(1) rename) in `savePreviousInstall`, benchmark binary size, and remove unneeded npm dependencies (`date-fns`, `validator`).
- [x] **Pragmatically reduce `extra-bin` dependency toward pure Deno:** absorbed all 10 `extra-bin/windows/os-utils/` scripts into pure TypeScript/Deno (Unicode-safe fail-closed Registry user `PATH` via .NET + `WM_SETTINGCHANGE` broadcast, inline env-var COM shortcut without `-ExecutionPolicy Bypass`, removed dead `.cmd`/`.ps1` wrappers), upgraded `DenoZip` to clamped disk-to-disk streaming (`DenoFileReader` + `outFile.writable`) as default `.zip` extractor (`7-Zip` retained for `.7z`/SFX and `>=50 MiB` Windows zips), switched `UnTar` to `System32\tar.exe` / POSIX `tar` with Windows `7z.exe` fallback, and updated `GitUtils` to prefer system `git.exe` on `PATH` with `MinGit` as Windows fallback.
- [x] **Cross-platform foundation (macOS & Linux) & multi-instance concurrency safety:**
  - Aligned with Levain's multi-OS intent (`levain.sh` POSIX binary + `deno run` fallback, `OsShell` `path.DELIMITER`, `OsUtils.createShortcut` POSIX symlink target/replacement, `LevainReleases` `LEVAIN_REPOSITORY` + OS/arch asset naming, OS-scoped recipe blocks `cmd.<stage>.{posix,windows,linux,darwin}` in `recipes/levain.levain.yaml` with single `build` copy and auto-OS `activateInit`, pure side-effect-free `ConfigPaths` getters).
  - Handled **two or more simultaneous Levain instances** safely on the same machine: atomic `O_CREAT|O_EXCL` `InstanceLock` (`<levainHome>/.levain/levain.lock`) with cross-platform stale-PID recovery (`node:process` `kill(pid, 0)`), short wait + localized fail-fast errors for mutating commands (`install`, `update`, `clean`, `--levain-upgrade`, `activate` pre/init, `shell` install stage, and non-blocking auto-clean), atomic writes for `levain.config.json`, pre-rename verified `FileWriter`/`FileCache` replacements, and append/degrade-safe shared `~/levain.log`.
- [ ] **Redesign `explain` as a human-readable manual playbook & "documentation inside Levain" UX:**
  - Rework `explain` so it serves as a clear step-by-step manual guide ("what to do yourself if you don't want Levain to automate it") with dependency order, resolved variables (masking secrets), and human-readable translations of recipe actions (plus optional `--raw` mode).
  - Refine CLI `--help` and `actions` descriptions so options are intuitive and self-documenting without needing to study external manuals first.
- [ ] **Documentation overhaul, GitHub Issues triage, handover & `v1.1.0` end-to-end validation:**
  - Overhaul `README.md` around the "documentation inside Levain" philosophy and add concise handover guides (`CONTRIBUTING.md`, `docs/MAINTAINING.md`).
  - Clean remaining handover debt (raw string `throw`s, non-English comments, `humanizeBytes`/`VersionNumber`/`ZipRepository`/`PackageManager` edge bugs, hardcoded `jmoalves/levain` in `LevainReleases`).
  - Review and triage open GitHub Issues (identify already-resolved items across Phases 1–5, obsolete issues, and true post-1.1.0 backlog).
  - Bump version to `1.1.0-SNAPSHOT` → pre-release `v1.1.0`, validate on a clean Windows machine over SSH (`deno task test:windows`, Windows Defender active, `pt-BR`, including `levain activate`) and run full `Test - e2e` workflow before promoting `v1.1.0` as `Latest`.
