# Levain v1 Housekeeping & Stabilization Roadmap

This roadmap tracks the engineering work to stabilize **Levain v1 (Deno 2)** on `master`, simplify long-term maintenance, and keep the codebase easy to hand over or adopt.

While v1 is being hardened and validated, `v0.93.1` remains the `Latest` release (with `v0.x` available for legacy hotfixes) and `v1.0.x` builds stay published as pre-releases.

---

## Status Overview

| Stage | Branch / Scope | Goal | Status |
| :--- | :--- | :--- | :--- |
| **Stage 0** | `v0.x`, `master` | Freeze Deno 1 on `v0.x`, promote `deno2_opus` to `master`, keep `deno2_opus` untouched as obsolete | Done |
| **Phase 1** | `chore/governance-and-agents` | Unified AI/contributor guidelines, generic Windows SSH testing contract, i18n/lint validation | Done |
| **Phase 2** | `chore/ci-and-build` | Fix `scripts/test.cmd` & coverage reporting, align Deno versions in CI, clean build/release scripts | Planned |
| **Phase 3** | `chore/security-hardening` | Remove `curl -k`, enable `deno.lock`, pin GitHub Actions & permissions, audit embedded binaries and runtime | Planned |
| **Phase 4** | `test/coverage-and-reliability` | Measure real coverage baseline, close test gaps in `src/cmd/`, core modules, actions, and `src/lib/io/` | Planned |
| **Phase 5** | `perf/startup-and-repos` | Optimize CI caching, binary startup/size, repository crawling, and complete v1 readiness checklist | Planned |

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

## Phase 2 — GitHub Actions, Build & Release Process

**Branch:** `chore/ci-and-build`

- [ ] Restore full functionality in `scripts/test.cmd` (`--denoDir`, `--coverage` generating `coverage/levain.lcov` for Codecov, `--checkSources`, `--parallel`, argument pass-through).
- [ ] Align default Deno version across `.github/workflows/test-unit.yml`, `checkSources.yml`, and `release.yml`.
- [ ] Add `deno lint` and i18n catalog checks to CI.
- [ ] Fix `scripts/levain-build.cmd` (`--denoDir` currently ignored during `deno compile`) and align `compile:windows`, `test.include` (include root `levain.test.ts`), and Deno 2 `fmt` format in `deno.json`.
- [ ] Parameterize repository owner/name (`GITHUB_REPOSITORY`) in `githubScripts/` instead of hardcoding `jmoalves/levain`, and remove dead/broken legacy scripts (`asset-upload.sh`, `clean-levain-release.sh`, `scripts/antigos/`).
- [ ] Standardize the `-SNAPSHOT` version convention in `recipes/levain.levain.yaml` and release scripts.
- [ ] Evaluate a lightweight Linux CI job for `check` + `lint` + cross-platform tests alongside `windows-latest`.

---

## Phase 3 — Security & Supply Chain Hardening

**Branch:** `chore/security-hardening`

- [ ] Remove insecure `curl -k` flags across `githubScripts/` (especially when downloading release binaries and sending `$GITHUB_TOKEN`), switching to `-fsSL` and `Authorization: Bearer` headers.
- [ ] Enable and commit `deno.lock` (`--frozen` in CI/release) for reproducible dependency resolution.
- [ ] Remove unused `@webui/deno-webui` from root `deno.json` (isolate experimental code in `inception/`).
- [ ] Declare explicit least-privilege `permissions:` blocks in all workflows and pin third-party GitHub Actions to commit SHAs.
- [ ] Review embedded binary provenance and checksum verification (`MinGit`, `7-Zip`) in `githubScripts/levain-embedded-binaries.sh`.
- [ ] Audit shell invocation, temporary file handling, and credential/password flows in `src/`.

---

## Phase 4 — Test Coverage & Suite Reliability

**Branch:** `test/coverage-and-reliability`

- [ ] Establish a real coverage baseline on Windows once `coverage/levain.lcov` reporting is restored in Phase 2.
- [ ] Fix the timer leak in `src/lib/extract/denozip_extractor.test.ts` and make platform/network boundaries explicit across tests.
- [ ] Add unit tests for uncovered commands in `src/cmd/` (`command_factory`, `install`, `update`, `list_command`, `info`, `explain`, `activate`, `activate_machine`, `clone`, `shell`, `actions`).
- [ ] Add unit tests for core runtime modules (`src/levain_cli.ts`, `src/lib/loader.ts`, `src/lib/i18n.ts`, `src/lib/paths/*`).
- [ ] Add unit tests for uncovered actions (`backup_file`, `os/mkdir`, `json_remove`, `levainShell`, `activate/*`, `check_port`, `check_url`) and the `src/lib/io/` layer.

---

## Phase 5 — Performance & v1 Production Readiness

**Branch:** `perf/startup-and-repos`

- [ ] Speed up CI by removing unnecessary `--reload` flags and caching `DENO_DIR`.
- [ ] Benchmark compiled `levain.exe` startup time and binary size; trim unnecessary runtime dependencies.
- [ ] Profile repository scanning and git updates (`FileSystemRepository.crawlPackages`, `GitRepository`).
- [ ] Validate v1 pre-releases end-to-end:
  - Run `Test - e2e` workflow against the latest `v1.0.x` pre-release.
  - Validate on a clean Windows machine over SSH (`deno task test:windows`) with Windows Defender active and `pt-BR` locale, including `levain activate`.
- [ ] Write a concise maintenance and ownership handover guide (`CONTRIBUTING.md` / `docs/MAINTAINING.md`).
