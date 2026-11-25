# Maintaining Levain

This runbook is a concise handover reference for maintainers of the `levain` repository.

---

## Architecture Overview

```text
levain.ts                        Entry point, per-run temp log setup, CLI error handling, exit codes
  └─ src/cli/cli_parser.ts       @cliffy/command routing, --help/--version, early flag/command validation
  └─ src/levain_cli.ts           Config load, InstanceLock, update check, RepositoryManager init, auto-clean
       └─ src/lib/loader.ts      Instantiates commands and actions; tokenizes & resolves ${...} variables
            ├─ src/cmd/          User-facing commands (CommandFactory)
            └─ src/action/       Recipe actions (ActionFactory + ActionDocs)
```

Key subsystems:

- **Repositories (`src/lib/repository/`):** `FileSystemRepository`, `GitRepository` (with TTL update caching via `LEVAIN_GIT_UPDATE_TTL_SECONDS`), `ZipRepository`, and `Registry` (installed recipes), composed via `ChainRepository` in `RepositoryManager`.
- **Variables & Explain (`src/lib/var_resolver.ts`, `src/lib/explain/`):** `VarResolver` handles recursive `${...}` substitution and `| urlEncode` filters at runtime; `PlaybookVarResolver` + `action_explainer.ts` render side-effect-free Markdown guides for `levain explain` without prompts or leaking secrets.
- **OS & Paths (`src/lib/os/`, `src/lib/paths/`):** `OsUtils` (Unicode-safe Windows Registry user `PATH`, shortcuts, `findInPath`, `runAndLog`), `OsShell` (ephemeral env-var secret passing), `ConfigPaths`, `HomePaths`, `LevainPaths`, and `ExtraBin`.
- **Cross-platform recipes (`src/lib/package/package_actions.ts`):** Recipes can declare common `cmd.<stage>` plus optional OS-scoped blocks `cmd.<stage>.posix`, `cmd.<stage>.windows`, `cmd.<stage>.linux`, and `cmd.<stage>.darwin`.
- **Concurrency & Persistence (`src/lib/fs/instance_lock.ts`, `src/lib/config.ts`):**
  - Mutating commands (`install`, `update`, `clean`, `--levain-upgrade`, `activate` pre/init, `shell` install stage) acquire an atomic `O_CREAT|O_EXCL` lock at `<levainHome>/.levain/levain.lock` with stale-PID recovery (`node:process` `kill(pid, 0)`).
  - Read-only commands (`list`, `info`, `explain`, `actions`, `_activate-machine cmd`) never lock and only persist config on actual changes (`config.saveIfChanged()`), using atomic temp-file renames (`FileUtils.writeTextFileAtomicSync`).
  - Logs default to a unique per-run temp file (`%TEMP%/levain-<timestamp>-XXXX.log`) so simultaneous instances never collide.

---

## Compiled Binary vs. Source Mode

`LevainPaths.levainRootFile` branches on `--is_compiled_binary`, which is baked into the executable by `githubScripts/levain-build.sh` and `scripts/levain-build.cmd`.

- In a release archive, recipes live under `build/recipes/` (which is why `recipes/levain.levain.yaml` copies `../../levain.cmd`, `../../levain.ps1`, `../../levain.sh`, and `../../build`).
- Whenever you change bootstrap paths, wrappers (`levain.cmd`, `levain.ps1`, `levain.sh`), or `extra-bin` layout, keep `githubScripts/levain-build.sh`, `scripts/levain-build.cmd`, and `recipes/levain.levain.yaml` in sync.

---

## Managing Dependencies & `extra-bin`

- **Deno dependencies (`deno.json` + `deno.lock`):** CI and build scripts run with `--frozen`. After updating any JSR/npm specifier in `deno.json`, refresh the lockfile and validate:
  ```bash
  deno cache --reload --lock=deno.lock levain.ts
  deno task integrate
  ```
- **GitHub Actions:** Third-party actions are pinned to full commit SHAs and tracked by `.github/dependabot.yml`.
- **Bundled Windows fallbacks (`extra-bin/windows/`):**
  - Only `7-Zip` (`.7z`/SFX and `>= 50 MiB` Windows `.zip` files) and `MinGit` (fallback when system `git` is absent from `PATH`) remain bundled.
  - Both are downloaded during release/dev setup with GitHub Release SHA-256 digest verification in `githubScripts/levain-embedded-binaries.sh`.

---

## Release Process

`master` is protected (PR-only) by a GitHub Ruleset, so releases never push version-bump commits directly to `master`.

1. **Prepare the release version on `master`:**
   - Ensure `recipes/levain.levain.yaml` has the desired `-SNAPSHOT` version (for example, `1.1.0-SNAPSHOT` produces release `v1.1.0`).
   - Confirm CI (`test-unit.yml`, `checkSources.yml`) is green on `master`.
2. **Run the Release workflow:**
   - Trigger [`.github/workflows/release.yml`](../.github/workflows/release.yml) (`workflow_dispatch`, optionally passing a custom version or using the `-SNAPSHOT` version from `recipes/levain.levain.yaml`).
   - The workflow builds `levain.exe`, bundles `extra-bin` and wrappers, computes `.sha256` checksums, pushes tag `vX.Y.Z` and branch `release/vX.Y.Z`, publishes a **Pre-release** on GitHub Releases, and opens an automatic PR bumping `recipes/levain.levain.yaml` to the next `-SNAPSHOT`.
3. **Merge the version-bump PR** created by `release.yml` once CI passes.
4. **Validate the Pre-release before promoting to `Latest`:**
   - Check the [`Test - e2e`](../.github/workflows/test-e2e.yml) workflow run triggered by the published release (installs via `install.ps1`, runs `levain list`, `levain install` across `levain-pkgs`, `levain update`, and Microsoft Security DevOps scan).
   - **Windows Defender & real-machine check:** test `install.ps1` with `$levainVersion="X.Y.Z"` and `levain activate` on at least one clean Windows machine with Windows Defender active (ideally `pt-BR` locale) — see [`testing/WINDOWS.md`](../testing/WINDOWS.md). Freshly compiled Deno executables can occasionally trigger Windows Defender heuristics; if flagged, submit a false-positive report to Microsoft Security Intelligence before promoting.
5. **Promote to `Latest`:**
   - Edit the release in GitHub Releases, uncheck **Pre-release**, mark **Set as the latest release**, and verify `iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex` on a clean shell.

---

## Branch Policy & Legacy `v0.x`

- **`master`:** Active v1 (Deno 2) branch. All changes go through PRs with passing `static-checks` and `unit-win`.
- **`v0.x`:** Frozen Deno 1.46.3 maintenance branch for emergency hotfixes if needed while users transition from `v0.93.1`.
- **Version bumps & compatibility:** Bump `version` in `recipes/levain.levain.yaml` when releasing new engine capabilities so recipes can declare `levain.minVersion`.

---

## Periodic Quality Audits

Five read-only review lenses live in `.agents/agents/` (`business-qa`, `technical-qa`, `security`, `performance`, `usability`). Running them selectively on high-risk PRs — and periodically across the full repository — helps catch security regressions, recipe-contract drift, performance bottlenecks, and i18n/UX issues early.
