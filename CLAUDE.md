# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Levain is a Deno/TypeScript CLI that installs and configures development environments on **Windows** from declarative YAML "recipes" (`*.levain.yaml`). It ships as a single compiled `levain.exe` (target `x86_64-pc-windows-msvc`) wrapped by `levain.cmd`.

**Sibling project:** [`jmoalves/levain-pkgs`](https://github.com/jmoalves/levain-pkgs) holds the actual installation recipes (jdk, git, eclipse, wlp, …). This repo only ships the engine plus the `levain` recipe itself in `recipes/`. `install/install.ps1` defaults to `--addRepo https://github.com/jmoalves/levain-pkgs.git`, and users can point elsewhere with `$levainRepo`. Recipe-format changes made here must stay compatible with what levain-pkgs publishes — bump `version` in `recipes/levain.levain.yaml` and use `levain.minVersion` in a recipe when a recipe needs a newer engine.

Deno version used in CI and releases: **1.46.3** (see `.github/workflows/*.yml`). Dependencies are remote URLs remapped through `import_map.json` — there is no `package.json`, and `deno.lock` is gitignored.

## Deno 1 → Deno 2 migration (in flight)

`master` is still **Deno 1** (pinned 1.46.3): remote `https://deno.land/std/...` imports remapped by `import_map.json`, and Deno-1-only APIs such as `Deno.run` (see `src/action/os/mkdir.ts`). Do not introduce Deno 2-only APIs here, and do not start yet another migration.

The migration lives on branch **`deno2_opus`** (pushed to `origin`, ahead of `master`, with outside contributions coming in as PRs). It moves dependencies to JSR/npm specifiers declared in `deno.json`, drops `import_map.json`, adds `deno task` entries (`test`, `compile:windows`, `fmt`, …) and reformats the whole tree. Earlier attempts survive as the stale `deno2` and `deno-latest` branches — `deno2_opus` is the one being validated.

Practical consequence: keep changes to `master` small and easy to merge forward, and expect large formatting-only diffs when comparing against `deno2_opus`.

## Commands

Windows `.cmd` scripts in `scripts/` are the primary dev entry points; they expect Deno at `<repo>/bin/deno.exe` (set up by `scripts/devLevain.cmd`, which also downloads `extra-bin`). Linux/macOS equivalents in `scripts/*.sh` use whatever `deno` is on PATH.

```cmd
scripts\devLevain.cmd            :: one-time dev setup: bin\deno.exe + extra-bin + cache
scripts\test.cmd                 :: all tests (deno test --allow-all --parallel)
scripts\test.cmd --coverage --checkSources
scripts\test.cmd -- --fail-fast  :: everything after `--` is passed to `deno test`
scripts\check-sources.cmd        :: deno check levain.ts + deno test --no-run, clean DENO_DIR
scripts\levain-deno.cmd list     :: run Levain from source (deno run --allow-all levain.ts ...)
scripts\testWatch.cmd            :: watch mode
```

Plain Deno equivalents (work anywhere):

```bash
deno test --allow-all --parallel                       # all tests
deno test --allow-all src/action/os/copy.test.ts       # a single test file
deno test --allow-all --filter "should show a text"    # a single test by name
deno check levain.ts                                   # typecheck
deno lint                                              # lint (config in deno.json)
deno cache --reload levain.ts                          # refresh remote deps
```

Tests need `--allow-all`: they touch the filesystem, env vars, the Windows registry and spawn processes.

**Do not run `deno fmt`.** The `fmt` block in `deno.json` (tabs, width 3, single quotes) does not match the actual source style (4 spaces, double quotes in most files); formatting would rewrite the whole tree.

## Platform reality

Almost everything meaningful is Windows-only. `OsUtils.onlyInWindows()` throws on other platforms, and many test files are wrapped in `if (OsUtils.isWindows()) { ... }` — so a green test run on Linux silently skips large parts of the suite. CI only runs `windows-latest`; the Linux/macOS unit-test job is commented out. Verify Windows-affecting changes on Windows.

## Architecture

Execution path: `levain.ts` (logging setup, global arg parsing) → `src/levain_cli.ts` (version check, `Config`, repository init, self-upgrade) → `Loader` → command or action.

**Two pluggable extension points, both registry-map factories.** Adding either means adding a `Map` entry plus a class:

- **Commands** (`src/cmd/`, `CommandFactory`): user-facing verbs — `install`, `shell`, `list`, `clean`, `actions`, `info`, `explain`, `clone`, `update`. Implement `Command` (`oneLineExample` + `execute(args)`).
- **Actions** (`src/action/`, `ActionFactory`): the verbs recipes use in `cmd.install` / `cmd.env` lines — `copy`, `addPath`, `setEnv`, `extract`, `template`, `contextMenu`, `jsonSet`, `mavenCopy`, etc. Implement `Action` (`execute(pkg, parameters)`).

`Loader.action()` splits a recipe line into action name + args, applies `handleQuotes`, then resolves `${...}` variables through `Config.replaceVars` → `VarResolver` **before** handing args to the action. Actions therefore receive fully-resolved strings; they parse their own flags with `parseArgs` from `src/lib/parse_args.ts` (a wrapper over std `flags` adding `stringOnce` / `stringMany` / `boolean` semantics, `stopEarly`, and rejection of unknown `-` options).

**Recipes / packages.** A recipe is `<name>.levain.yaml` with `version`, `dependencies`, `cmd.install` (list of action lines), `cmd.env` (actions applied on every shell/env setup), and `levain.*` tags (`levain.pkg.skipRegistry`, `levain.pkg.skipInstallDir`, `levain.preserveBaseDirOnUpdate`, `minVersion`). `FileSystemPackage` parses the YAML; `installed` and `updateAvailable` are computed by comparing the recipe against the copy stored in the **registry** (`<levainHome>/.levain/registry`) — installation is recorded by copying the recipe there, so any recipe change marks the package as updatable.

`levain` is injected as the first dependency of every package (`FileSystemPackage.normalizeDeps`).

**Repositories** (`src/lib/repository/`) resolve recipe names to packages. `RepositoryFactory` picks an implementation from the URI shape: git URL → `GitRepository`, `*.zip` → `ZipRepository`, otherwise `FileSystemRepository`; results are memoized in a static `knownRepos` map. `RepositoryManager` composes them into a `ChainRepository` over three sets: `installed` (the registry), `regular` (levain's own `recipes/` + `--addRepo` + `--tempRepo`), and `currentDir` (a recipe in the CWD — this is what makes bare `levain install` work from a project folder).

**Config** (`src/lib/config.ts`) is the single context object threaded through every command and action. It derives `levainHome` from `--levainHome`, the saved config file, the `levainHome` env var, or `$HOME/levain`, and owns the derived dirs (`levainBaseDir`, `levainConfigDir`, `levainRegistryDir`, `levainSafeTempDir`, `levainBackupDir`, `levainCacheDir`), user info (login/password/email/fullname, prompted lazily by `VarResolver`), and persistence of the config file — now `$HOME/levain.config.json`, with `<levainHome>/.levain/config.json` still read as the legacy location.

**Version** is read at runtime from `recipes/levain.levain.yaml` (`LevainVersion.levainVersion`), not from a constant. The release workflow rewrites that `version:` field; commits from the release scripts are prefixed `skip:`. `-SNAPSHOT` on master means HEAD/dev.

**Compiled vs. source.** `Levain.levainRootFile` branches on the `--is_compiled_binary` flag, which `levain-build.sh` bakes into the compiled binary — this is how the binary locates its `recipes/` and `extra-bin/` dirs. If you touch that logic, keep `levain.ts`, `githubScripts/levain-build.sh` and `scripts/levain-build.cmd` in sync.

**extra-bin** (`src/lib/extra_bin.ts`) points at bundled Windows tools (7-Zip, git, os-utils) under `extra-bin/windows/`. Those binaries are gitignored and fetched by `devLevain.cmd` from the latest release.

## i18n

All user-facing strings go through `t("key")` from `src/lib/i18n.ts`, backed by `src/locales/{en,pt}/translation.json`; the locale comes from the system. Adding a message means adding the key to **both** JSON files. Keys mirror the module path (e.g. `cmd.install.noPackages`, `lib.repository.repository_manager.notFound`).

The translation catalogs are the *only* bilingual content in the repository: code, identifiers, comments, documentation and commit messages are written in English. Some older commits in the history are in Portuguese; that is not the convention.

## Testing conventions

Tests live next to the code as `*.test.ts` and use `Deno.test` with std `assert`. Shared helpers in `src/lib/test/`:

- `TestHelper` — `getConfig()`, `mockPackage()`, `getTestDataPath(...)`, `getNewTempDir()`, `setupTestLogger()`, plus `folderThatAlwaysExists` / `fileThatDoesNotExist` style constants.
- `more_asserts.ts` — `assertFind`, `assertFolderIncludes`, `assertPathEndsWith`, `assertDirCount`, …
- `levain_asserts.ts` — package-list assertions.
- `MockPackage`, `MockRepository`, `PackageManagerMock` for fakes.

Some tests hit the network: `git_repository.test.ts` clones `jmoalves/levain-pkgs` and `zip_repository.test.ts` fetches from GitHub, so they fail offline or behind an unconfigured proxy.

Fixtures live in `testdata/<feature>/`. Log-based assertions are common: capture with `TestHelper.setupTestLogger()` and assert against `testLogger.messages` (entries look like `"DEBUG ECHO Hello world!"`).

## GitHub Actions

Four workflows in `.github/workflows/`. All Windows jobs bootstrap Deno through `githubScripts/get-deno.*` into a temp `DENO_DIR` rather than using a setup action; the Deno version is a `workflow_dispatch` input defaulting to `1.46.3`.

- **`test-unit.yml` — Unit tests.** `windows-latest`, on every push and PR, weekly (Sun 05:00 UTC) and manually. Fetches Deno + `extra-bin`, then runs `scripts\test.cmd --denoDir ... --coverage --checkSources` and uploads `coverage/levain.lcov` to Codecov. A matching Linux/macOS job exists but is commented out.
- **`checkSources.yml` — Check sources.** `windows-latest`, weekly (Sun 04:30 UTC) and manually; the `push` trigger is commented out. Runs `scripts\check-sources.cmd`, i.e. `deno check levain.ts` plus `deno test --no-run` against a *clean* `DENO_DIR`, which is what catches broken remote imports.
- **`release.yml` — Create a new release.** Manual only, `ubuntu-latest`. Reads the version from `recipes/levain.levain.yaml`, then: `tag-release.sh` commits `skip: vX.Y.Z`, tags it, and commits the next `-SNAPSHOT`; `levain-build.sh` cross-compiles `levain.exe` for `x86_64-pc-windows-msvc`; `changelog.sh` builds the release notes; `levain-package*.sh` produce `levain-windows-x86_64.zip` (plus a versioned copy), `levain-extra-bin-windows-x86_64.zip`, `install.ps1` and `.sha256` files. The release is created as **draft + prerelease**, then published — promoting it to "latest" is the manual step in *Releasing* below. A follow-up `install-win` job installs the fresh release on Windows and runs `levain list`.
- **`test-e2e.yml` — Test - e2e.** `windows-latest`, 120 min timeout; on `release: published`, weekly (Sun 06:00 UTC) and manually with an optional `levainVersion`. Installs Levain via `install.ps1` (currently pinned to `raw.githubusercontent.com/.../master/install/install.ps1` as a documented workaround), then installs *every* package listed by `levain list` except a hardcoded skip list (`git-config`, the older `eclipse-*`, `postman`, `tomcat-9`), and finally runs `levain update`. This is the job that exercises levain-pkgs end to end. Microsoft Security DevOps scans run between steps.

## Releasing

Documented in `README.md`: bump the SNAPSHOT version in `recipes/levain.levain.yaml`, run the "Create a new release" GitHub action, then verify the binary is not blocked by Windows Defender, test on at least two machines, and flip the GitHub release from pre-release to latest.
