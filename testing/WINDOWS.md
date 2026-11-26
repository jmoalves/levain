# Windows Testing Guide

Levain targets **Windows** (`OsUtils.onlyInWindows()`, Registry actions, PowerShell, user `PATH`, Desktop/Start Menu shortcuts, and Windows Defender behavior). Running `deno test` on Linux or macOS silently skips Windows-only tests, so Windows-affecting changes must be validated on a real Windows environment.

There are **four distinct Windows testing scenarios** — and they are **not interchangeable**. Each trades off isolation, fidelity, speed, and host requirements.

---

## Scenario Comparison Matrix

| Scenario | Works From | Clean Registry / `PATH` / Profile | No Pre-installed Tools | Client Windows (`pt-BR`) | Real Windows Defender | Full E2E (`levain-pkgs`) | Primary Role |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1. GitHub Actions (`windows-latest`)** | Any OS (remote) | Yes | Yes | No (Server `en-US`) | Partial (Server / MSDO) | Yes (`test-e2e.yml`) | **Authoritative CI gate** for PRs, weekly checks, and releases |
| **2. Remote Windows over SSH** (`deno task test:windows`) | Any OS (Linux / macOS / Windows) & AI agents | Yes *(disposable)* / Partial *(existing)* | Yes *(disposable)* | Yes | **Yes (real)** | Not recommended (disk/time) | **Preferred real-Windows validation** before PRs/releases and for AI agents |
| **3. Windows Sandbox** (`WindowsSandbox.exe`) | Windows 10/11 **Pro / Enterprise** only | Yes (wiped on close) | Yes | Matches host | No (not representative of host) | No | **Fast zero-state simulation** on a Windows workstation without managing a VM |
| **4. Local Windows machine** (`deno task integrate` / `--local`) | Windows only | No *(mutates `HKCU`, `PATH`, Desktop, Start Menu)* | No (shares `HKLM` & installed apps) | Yes | Masked by local exclusions | No | **Fast inner-loop iteration** during development |

### Why They Are Not Equivalent

* **Local vs. Windows Sandbox:** local runs are the fastest for day-to-day edits, but they mutate your user profile (`HKCU`, `PATH`, Desktop, Start Menu) and can accidentally pass thanks to globally installed tools or state left behind by earlier runs. **Windows Sandbox** solves state isolation in seconds, but only exists on Windows Pro/Enterprise and does not reproduce real-world Windows Defender behavior.
* **Windows Sandbox vs. Remote Windows over SSH:** the **SSH contract** works identically from Linux, macOS, Windows, and AI assistants, and when backed by a clean client Windows installation (`pt-BR`, Defender enabled), it is the only automated environment that closely matches real end-user machines — including Defender blocking `levain.exe`.
* **Remote Windows over SSH vs. GitHub Actions:** `windows-latest` is the authoritative CI gate and runs the full `Test - e2e` suite against `levain-pkgs`, but it runs **Windows Server (`en-US`)** rather than client Windows (`pt-BR`).

### Recommended Workflow

1. **Fast inner loop:** `deno task integrate:quick` (Linux/macOS) or `deno task integrate` (Windows).
2. **Before opening a PR touching Windows / OS / Registry / PATH:** run `deno task test:windows` (remote Windows over SSH), or Windows Sandbox if developing on Windows Pro/Enterprise without an SSH target.
3. **PR merge gate:** GitHub Actions `Unit tests` (`static-checks` + `unit-win`).
4. **Before promoting a pre-release to `Latest`:** run `Test - e2e` on GitHub Actions **and** validate `levain.exe` with Windows Defender active on a clean client Windows machine (via SSH or real test workstations).

---

## 1. GitHub Actions (`windows-latest`)

Automated workflows in `.github/workflows/`:

* **`test-unit.yml`** (every push, PR, weekly, and manual): runs fast `static-checks` on `ubuntu-latest` (`deno check`, `deno lint`, `deno task check:i18n`, tooling tests) and `unit-win` on `windows-latest` (`scripts\test.cmd --coverage --checkSources` + Codecov upload).
* **`checkSources.yml`** (weekly and manual): runs `scripts\check-sources.cmd` with a clean `DENO_DIR`.
* **`test-e2e.yml`** (on release published, weekly, and manual via `workflow_dispatch` with optional `levainVersion`, `buildFromRef`, and `packages`): installs Levain via `install.ps1` (or compiles `levain.exe` from the current branch when `buildFromRef=true`), scans the installed `levain` directory with Windows Defender (`scripts\msDefender.cmd`), installs the curated default package list in `testing/e2e/default-packages.txt` from `levain-pkgs` (or a custom `packages` subset), runs `levain update`, and executes real-effect verification via `testing/e2e/verify-e2e.ts` (compiled CLI commands, `levain activate` in PowerShell/CMD/Git Bash, real tool execution, `explain`/`explain --uninstall`, and 2-process `InstanceLock` concurrency).

---

## 2. Preferred: Remote Windows Machine Over SSH

To let any developer or AI assistant (Antigravity, Claude Code, terminal user) run the suite the same way without coupling this repository to any specific machine, hypervisor, or cloud provider, remote Windows tests use a **two-variable environment contract**:

| Variable | Description |
| :--- | :--- |
| `LEVAIN_TEST_SSH_CONFIG` | Path to an `ssh_config` file that knows how to reach the Windows test machine. |
| `LEVAIN_TEST_HOST` | Host alias defined inside that `ssh_config`. |

### Contract Rules

* **Transport:** all remote operations use **only** `ssh -F "$LEVAIN_TEST_SSH_CONFIG" "$LEVAIN_TEST_HOST" ...`, and pass the same `-F "$LEVAIN_TEST_SSH_CONFIG"` to `scp` (or `rsync -e "ssh -F \"$LEVAIN_TEST_SSH_CONFIG\""`).
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
3. Copies the archive and a generated `.cmd` runner script to the remote Windows host using `scp -F "$LEVAIN_TEST_SSH_CONFIG"`.
4. Runs a `cmd.exe` session via `ssh -F "$LEVAIN_TEST_SSH_CONFIG" "$LEVAIN_TEST_HOST"` that:
   * Extracts the archive into an isolated directory (`levain-test-<runId>`) using Windows' built-in `tar`.
   * Bootstraps `bin\deno.exe` and `extra-bin` (including bundled `git` and `7-Zip`) via `scripts\devLevain.cmd`.
   * Prepends the isolated `bin` and `extra-bin\windows\git\cmd` directories to `PATH` for the session.
   * Executes `deno check levain.ts`, `deno lint`, and `deno test --allow-all --parallel` (plus any forwarded test arguments).
5. Removes the temporary archive, script, and remote working directory (unless `--keep-remote` is set) and exits with the remote test exit code.

### Running Synthetic End-to-End Tests Over SSH (`deno task test:e2e:windows`)

Using the **exact same** `LEVAIN_TEST_SSH_CONFIG` and `LEVAIN_TEST_HOST` contract (and skipping cleanly with exit 0 when unset), `testing/run-windows-e2e.ts` compiles or installs a real `levain.exe` into an isolated remote directory, installs recipes, runs `levain update`, and executes `testing/e2e/verify-e2e.ts` (CLI commands, `levain activate` across PowerShell/CMD/Git Bash, real tool probes, `explain --uninstall`, and 2-process `InstanceLock` concurrency):

```bash
# Build and validate the current branch end-to-end against the curated default levain-pkgs list
# (testing/e2e/default-packages.txt: git, jdk-21-ibm-latest, maven-latest, node-runtime-latest,
# openliberty-runtime-latest, vscode, deno, jq)
deno task test:e2e:windows

# Validate a specific published pre-release via install.ps1
deno task test:e2e:windows -- --levain-version 1.1.0

# Validate external/private recipe catalogs using a curated package file owned by that catalog
# (plain text, one package per line, `#` comments allowed) plus an optional custom TypeScript verifier
deno task test:e2e:windows -- \
  --repo https://github.com/jmoalves/levain-pkgs.git \
  --repo https://example.org/org/custom-recipes.git \
  --packages-file /path/to/custom-recipes/e2e-packages.txt \
  --verify /path/to/custom-recipes/verify-custom.ts

# Run locally on a Windows workstation (uses an isolated temporary levainHome)
deno task test:e2e:windows -- --local --packages git,jdk-21-ibm-latest,maven-latest
```

---

## 3. Windows Sandbox (Windows 10/11 Pro / Enterprise Only)

If you develop on Windows Pro or Enterprise and want a disposable zero-state run without maintaining a separate VM, enable the optional Windows feature **Windows Sandbox** and launch it with a local `.wsb` file (kept outside version control):

```xml
<Configuration>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>REPLACE_WITH_LOCAL_PATH_TO_LEVAIN_REPO</HostFolder>
      <SandboxFolder>C:\levain-src</SandboxFolder>
      <ReadOnly>true</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>cmd /k "xcopy /e /i /q C:\levain-src C:\levain-work && cd /d C:\levain-work && call scripts\devLevain.cmd 2.9.8 && call scripts\test.cmd --checkSources"</Command>
  </LogonCommand>
</Configuration>
```

> **Important:** always copy the mapped repository to an internal folder (`C:\levain-work`) before running tests — mapped folders have different permission/read-only semantics than a native NTFS volume. Also remember that Windows Sandbox does **not** replace real Windows Defender validation on a full Windows installation.

---

## 4. Local Windows Machine

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

> **Tip to protect your primary Windows profile:** because the test suite writes to `HKCU`, user `PATH`, Desktop, and Start Menu, you can run tests under a **dedicated disposable local Windows user account** (even via OpenSSH to `localhost` using the same `LEVAIN_TEST_SSH_CONFIG` / `LEVAIN_TEST_HOST` contract). Keep in mind this isolates `HKCU` and `%USERPROFILE%`, but still shares `HKLM`, globally installed applications, and host Windows Defender exclusions.
