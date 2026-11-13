# AGENTS.md - Repository Guidelines for AI Assistants

This file provides unified guidance for all AI coding assistants (Claude Code, GitHub Copilot, OpenAI Codex, Cursor, Antigravity) and contributors working in this repository.

---

## 🎯 What this is

Levain is a Deno/TypeScript CLI that installs and configures development environments on **Windows** from declarative YAML "recipes" (`*.levain.yaml`). It ships as a single compiled `levain.exe` (target `x86_64-pc-windows-msvc`) wrapped by `levain.cmd`.

**Sibling project:** [`jmoalves/levain-pkgs`](https://github.com/jmoalves/levain-pkgs) holds the actual installation recipes (jdk, git, eclipse, wlp, …). This repo only ships the engine plus the `levain` recipe itself in `recipes/`. `install/install.ps1` defaults to `--addRepo https://github.com/jmoalves/levain-pkgs.git`, and users can point elsewhere with `$levainRepo`. Recipe-format changes made here must stay compatible with what levain-pkgs publishes — bump `version` in `recipes/levain.levain.yaml` and use `levain.minVersion` in a recipe when a recipe needs a newer engine.

---

## 🚀 Deno 1 → Deno 2 Migration Status

* `master` is **Deno 1** (pinned 1.46.3): remote `https://deno.land/std/...` imports remapped by `import_map.json`.
* The migration lives on branch **`deno2_opus`**: moves dependencies to JSR/npm specifiers in `deno.json`, drops `import_map.json`, adds `deno task` entries (`test`, `compile:windows`, `integrate`, etc.).

---

## ⚙️ Pre-Commit & Integration Protocol

This protocol is encapsulated as an agent skill located at [`.agents/skills/levain-integrate/SKILL.md`](.agents/skills/levain-integrate/SKILL.md).
All AI assistants should consult this skill when verifying changes, integrating code, or preparing commits.

Before creating a commit, proposing a Pull Request, or concluding any task:
1. **Run the local integration checks:**
   ```bash
   deno task integrate
   ```
   *(Or `deno task integrate:quick` for rapid static typing and targeted unit tests).*
2. **Never commit if checks fail:** Stop immediately and address any failing test or type error.
3. **Formulate a Conventional Commit message in English:**
   - Format: `<type>(<scope>): <subject>`
   - Allowed types: `feat`, `fix`, `test`, `refactor`, `perf`, `chore`, `docs`.
   - Allowed scopes: `action`, `cmd`, `config`, `repo`, `fs`, `os`, `cli`, `i18n`, `deps`, `workflow`.
4. **Human-in-the-Loop Rule:**
   - **NEVER** run `git commit` or `git push` autonomously.
   - Always present the proposed commit message and list of changed files to the user for explicit approval first.
5. **Push & Merge Request (MR/PR):**
   - Once the commit is completed, ask the user for confirmation to push (`git push -u origin <branch>`).
   - Provide the direct URL to open the Merge Request / Pull Request along with a structured title and description summarizing the changes and integration status.

---

## 💻 Primary Development Commands

Windows `.cmd` scripts in `scripts/` are primary dev entry points on Windows:
```cmd
scripts\devLevain.cmd            :: one-time dev setup: bin\deno.exe + extra-bin + cache
scripts\test.cmd                 :: all tests (deno test --allow-all --parallel)
scripts\test.cmd --coverage --checkSources
scripts\test.cmd -- --fail-fast  :: everything after `--` is passed to deno test
scripts\check-sources.cmd        :: deno check levain.ts + deno test --no-run, clean DENO_DIR
scripts\levain-deno.cmd list     :: run Levain from source (deno run --allow-all levain.ts ...)
scripts\testWatch.cmd            :: watch mode
```

Deno tasks and commands (work anywhere):
```bash
deno task integrate                                    # fast-fail cascaded checks (types -> targeted -> full)
deno task integrate:quick                              # fast-fail targeted checks only
deno test --allow-all --parallel                       # all tests
deno test --allow-all src/action/os/copy.test.ts       # a single test file
deno test --allow-all --filter "should show a text"    # a single test by name
deno check levain.ts                                   # typecheck
deno lint                                              # lint (config in deno.json)
```

> **Warning:** **Do not run `deno fmt`.** The `fmt` block in `deno.json` does not match the actual repository source style (4 spaces, double quotes in most files); running it would rewrite the whole tree.

---

## 🪟 Platform Reality

Almost everything meaningful in Levain is **Windows-only**. `OsUtils.onlyInWindows()` throws on other platforms, and many test files are wrapped in `if (OsUtils.isWindows()) { ... }` — so a green test run on Linux silently skips large parts of the suite. CI only runs `windows-latest`. Always verify Windows-affecting changes on Windows.

---

## 🏗️ Architecture

Execution path: `levain.ts` (logging setup, global arg parsing) → `src/levain_cli.ts` (version check, `Config`, repository init, self-upgrade) → `Loader` → command or action.

**Two pluggable extension points, both registry-map factories:**
- **Commands** (`src/cmd/`, `CommandFactory`): user-facing verbs — `install`, `shell`, `list`, `clean`, `actions`, `info`, `explain`, `clone`, `update`. Implement `Command` (`oneLineExample` + `execute(args)`).
- **Actions** (`src/action/`, `ActionFactory`): verbs recipes use in `cmd.install` / `cmd.env` lines — `copy`, `addPath`, `setEnv`, `extract`, `template`, `contextMenu`, `jsonSet`, `mavenCopy`, etc. Implement `Action` (`execute(pkg, parameters)`).

`Loader.action()` splits a recipe line into action name + args, applies `handleQuotes`, then resolves `${...}` variables through `Config.replaceVars` → `VarResolver` **before** handing args to the action. Actions parse flags with `parseArgs` from `src/lib/parse_args.ts`.

**Repositories** (`src/lib/repository/`) resolve recipe names to packages:
- Git URL → `GitRepository`
- `*.zip` → `ZipRepository`
- Otherwise → `FileSystemRepository`
Composed via `ChainRepository` across installed (registry), regular (`recipes/` + `--addRepo`), and current directory (`currentDir`).

**Config** (`src/lib/config.ts`) is threaded through every command and action, owning base dirs, user credentials, and config persistence (`$HOME/levain.config.json`).

**Version** is read at runtime from `recipes/levain.levain.yaml` (`LevainVersion.levainVersion`).

**extra-bin** (`src/lib/extra_bin.ts`) points at bundled Windows tools (7-Zip, git, os-utils) under `extra-bin/windows/`.

---

## 🌐 i18n

All user-facing strings go through `t("key")` from `src/lib/i18n.ts`, backed by `src/locales/{en,pt}/translation.json`; the locale comes from the system. Adding a message means adding the key to **both** JSON files.

The translation catalogs are the *only* bilingual content: code, identifiers, comments, documentation, and commit messages are written in **English**.

---

## 🧪 Testing Conventions

Tests live next to the code as `*.test.ts` and use `Deno.test` with std `assert`. Shared helpers in `src/lib/test/`:
- `TestHelper` — `getConfig()`, `mockPackage()`, `getTestDataPath(...)`, `getNewTempDir()`, `setupTestLogger()`.
- `more_asserts.ts` — `assertFind`, `assertFolderIncludes`, `assertPathEndsWith`, `assertDirCount`.
- `levain_asserts.ts` — package-list assertions.
- `MockPackage`, `MockRepository`, `PackageManagerMock` for test doubles.
- Fixtures live in `testdata/<feature>/`.
