# Contributing to Levain

Thank you for contributing to Levain! This guide covers local setup, quality checks, and how to extend Levain safely.

For full repository conventions (also shared with AI coding assistants), see [`AGENTS.md`](AGENTS.md).

---

## Prerequisites

- **Deno 2** (CI currently pins **Deno `2.9.8`** — see `.github/workflows/test-unit.yml`)
- **Git**

On Windows, you can run the one-time development setup script to fetch a local `bin\deno.exe`, `extra-bin` fallback binaries, and dependency cache:

```cmd
scripts\devLevain.cmd
```

---

## First-Time Clone Setup

Enable the repository Git hooks once per clone so accidental commits or pushes directly to `master` are rejected locally:

```bash
deno task setup:hooks
```

---

## Branch & Pull Request Rules

- **Never commit or push directly to `master`** (enforced by local hooks and GitHub branch protection).
- Create a short-lived thematic branch (`feat/...`, `fix/...`, `refactor/...`, `test/...`, `perf/...`, `docs/...`, `chore/...`) from `master`.
- Write code, comments, documentation, and Conventional Commit messages in **English**:
  ```text
  <type>(<scope>): <short imperative subject>
  ```
  - Allowed types: `feat`, `fix`, `test`, `refactor`, `perf`, `chore`, `docs`
  - Allowed scopes: `action`, `cmd`, `config`, `repo`, `fs`, `os`, `cli`, `i18n`, `deps`, `workflow`, `testing`
- Open a Pull Request targeting `master`. Required CI checks (`static-checks`, `unit-win` on Windows, and Codecov) must pass before merging.

---

## Development & Verification Commands

Run the full cascaded integration check before committing:

```bash
deno task integrate          # typecheck + lint + i18n parity -> targeted tests -> full test suite
deno task integrate:quick    # fast iteration: skips the full suite
deno task check:i18n         # verify en/pt translation catalog keys and {{placeholders}}
deno task test               # run all unit tests (deno test --allow-all)
deno check --frozen levain.ts
deno lint
```

### Running Levain from Source

```bash
deno run --allow-all levain.ts --help
deno run --allow-all levain.ts list
```

On Windows, helper wrappers are available in `scripts/`:

```cmd
scripts\levain-deno.cmd list
scripts\test.cmd
scripts\testWatch.cmd
```

To point your local `levain` shell integration at your source checkout on Windows:

```cmd
scripts\levain-deno.cmd _activate-machine init --dev --cmd --bash --powershell --cmder
```

### Windows Validation

Most OS-integration features in Levain are Windows-specific, so a green Linux/macOS run skips Windows-only test branches. See [`testing/WINDOWS.md`](testing/WINDOWS.md) for all four Windows testing options, including remote validation via `deno task test:windows`.

---

## Extending Levain

### Adding or Changing a Command

1. Implement `Command` in `src/cmd/` and register it in `src/cmd/command_factory.ts`.
2. Wire CLI flags, arguments, and localized `.example(...)` entries in `src/cli/cli_parser.ts`.
3. Decide whether the command mutates state on disk; if so, ensure `LevainCli.LOCKED_COMMANDS` in `src/levain_cli.ts` acquires `InstanceLock`.
4. Add unit tests next to the implementation (`*.test.ts`).

### Adding or Changing a Recipe Action

1. Implement `Action` in `src/action/` and register it in `src/action/action_factory.ts`.
2. Add its documentation metadata (`usage` + `summaryKey`) to `src/action/action_docs.ts` (enforced 1-to-1 by `src/action/action_docs.test.ts`).
3. Add a human-readable manual translation in `src/lib/explain/action_explainer.ts` so `levain explain` stays complete.
4. Cover the action and every new option in `testdata/contracts/` (verified by `test/action_contracts.test.ts`) and add focused unit tests.
5. **Preserve backward compatibility** for [`jmoalves/levain-pkgs`](https://github.com/jmoalves/levain-pkgs) and external/private recipe catalogs — never remove or break existing action options without deprecation, and use `levain.minVersion` when a recipe requires a newer engine.

### User-Facing Strings & i18n

All user-facing text must go through `t("key")` (`src/lib/i18n.ts`) and be added to **both**:

- `src/locales/en/translation.json`
- `src/locales/pt/translation.json`

Keys and `{{placeholder}}` names must match identically (checked automatically by `deno task check:i18n`).

### Formatting

`deno.json` configures 2-space indentation, double quotes, semicolons, and 120-char line width. Keep formatting changes scoped to the files you touch.

---

## Security

Please report security issues privately following [`SECURITY.md`](SECURITY.md). Never include private URLs, credentials, internal hostnames, or organization-specific identifiers in tests, fixtures, commits, or docs.
