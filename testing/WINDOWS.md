# Windows Testing Guide

Levain targets **Windows** (`OsUtils.onlyInWindows()`, Registry actions, PowerShell, user `PATH`, Desktop/Start Menu shortcuts, and Windows Defender behavior). Running `deno test` on Linux or macOS silently skips Windows-only tests, so Windows-affecting changes must be validated on a real Windows machine (and on GitHub Actions `windows-latest` before release).

There are two supported ways to run the test suite on Windows:

1. **Preferred — A remote Windows machine reachable over SSH** (clean disposable machine per run, or an existing Windows machine).
2. **Local — Directly on the current Windows machine.**

---

## 1. Preferred: Remote Windows Machine Over SSH

To let any developer or AI assistant (Antigravity, Claude Code, terminal user) run the suite the same way without coupling this repository to any specific machine, hypervisor, or cloud provider, remote Windows tests use a **two-variable environment contract**:

| Variable | Description |
| :--- | :--- |
| `LEVAIN_TEST_SSH_CONFIG` | Path to an `ssh_config` file that knows how to reach the Windows test machine. |
| `LEVAIN_TEST_HOST` | Host alias defined inside that `ssh_config`. |

### Contract Rules

* **Transport:** All remote operations use **only** `ssh -F "$LEVAIN_TEST_SSH_CONFIG" "$LEVAIN_TEST_HOST" ...`, and pass the same `-F "$LEVAIN_TEST_SSH_CONFIG"` to `scp` (or `rsync -e "ssh -F \"$LEVAIN_TEST_SSH_CONFIG\""`).
* **Remote environment expectations:**
  * A clean Windows installation (Windows Defender enabled, `pt-BR` locale recommended to match real users).
  * The SSH login shell is **`cmd.exe`** (not PowerShell or bash).
  * The SSH user has **administrator** privileges.
  * Nothing from Levain needs to be pre-installed — bootstrapping `Deno`, `extra-bin` (which bundles `git` and `7-Zip`), and transferring the repository snapshot are handled by the test runner.
  * The preferred target is a **disposable machine that starts clean on every run**, because Levain's test suite mutates HKCU, user `PATH`, Desktop, and Start Menu. An **existing Windows machine** also works: each run is isolated inside its own temporary directory under the remote user's profile and cleaned up afterwards (unless `--keep-remote` is passed).
* **Provisioning lives outside this repository:** creating, starting, stopping, resetting, and exposing the machine and environment variables are out of scope here.
* **Missing-contract behavior:** if `LEVAIN_TEST_SSH_CONFIG` or `LEVAIN_TEST_HOST` is missing (or the config file does not exist), the runner **skips cleanly (exit 0)** with a clear message telling you what is missing and where this contract is documented. It never fails or attempts to discover a machine on its own.
* **Public repository rule:** never commit machine names, cloud accounts, local paths, or network addresses.

### Running Remote Windows Tests

```bash
# Run the full Windows suite via the SSH contract (skips cleanly if env vars are unset)
deno task test:windows

# Run a single test file or filter on the remote Windows machine
deno task test:windows -- --filter "Registry"
deno task test:windows -- src/action/os/add_path.test.ts

# Override the Deno version bootstrapped on the remote machine
deno task test:windows -- --deno-version 2.9.8

# Run only typecheck and lint remotely (skip full test suite)
deno task test:windows -- --check-only

# Keep the remote temporary working directory after the run (useful for debugging)
deno task test:windows -- --keep-remote
```

### What the Runner Does

1. Validates `LEVAIN_TEST_SSH_CONFIG` and `LEVAIN_TEST_HOST` (skips with exit 0 if unset or unreadable).
2. Packages a clean snapshot of the current workspace (tracked and non-ignored files, excluding `.git/`, `bin/`, `extra-bin/`, `target/`, `coverage/`, `cache/`) into a temporary `.tar.gz` archive.
3. Copies the archive to the remote Windows host using `scp -F "$LEVAIN_TEST_SSH_CONFIG"`.
4. Runs a `cmd.exe` session via `ssh -F "$LEVAIN_TEST_SSH_CONFIG" "$LEVAIN_TEST_HOST"` that:
   * Extracts the archive into an isolated directory (`levain-test-<runId>`) using Windows' built-in `tar`.
   * Bootstraps `bin\deno.exe` and `extra-bin` (including bundled `git` and `7-Zip`) via `scripts\devLevain.cmd`.
   * Prepends the isolated `bin` and `extra-bin\windows\git\cmd` directories to `PATH` for the session.
   * Executes `deno check levain.ts`, `deno lint`, and `deno test --allow-all --parallel` (plus any forwarded test arguments).
5. Removes the temporary archive and remote working directory (unless `--keep-remote` is set) and exits with the remote test exit code.

---

## 2. Local Windows Machine

When developing directly on a Windows machine, you can run the suite locally without SSH:

```cmd
:: One-time setup (downloads bin\deno.exe and extra-bin)
scripts\devLevain.cmd 2.9.8

:: Cascaded integration checks (recommended before committing)
deno task integrate

:: Or invoke the unified runner explicitly in local mode
deno task test:windows -- --local
deno task test:windows -- --local -- --filter "Registry"
```

> **Note on machine state:** The Windows test suite writes to HKCU, user `PATH`, Desktop, and Start Menu. When validating release candidates or Windows Defender behavior, prefer a clean disposable Windows machine via the SSH contract above or GitHub Actions `windows-latest`.
