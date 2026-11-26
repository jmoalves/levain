# Release Validation Guide

This guide is the practical manual validation checklist to run **before promoting any Pre-release (`vX.Y.Z`) to `Latest`** on GitHub Releases.

Automated CI (`Unit tests` and `Test - e2e`) runs on `windows-latest` (Windows Server, `en-US`). Manual validation on a **real client Windows workstation** (`pt-BR` recommended, Windows Defender real-time protection active) closes the remaining gap: real Windows Defender heuristics, real interactive shell profiles, locale/encoding behavior, and clean removal.

---

## 1. Automated Pre-Release Gates

Confirm all automated checks are green before starting manual testing:

- [ ] **`Unit tests` (`static-checks` + `unit-win`)** and Codecov checks are green on `master`.
- [ ] *(Optional pre-tag check)* Trigger [`Test - e2e`](../.github/workflows/test-e2e.yml) via `workflow_dispatch` with `buildFromRef: true` (full catalog or a smoke subset like `git,jdk-21,maven`) to verify the compiled branch before tagging.
- [ ] Trigger [`Create a new release`](../.github/workflows/release.yml) to publish the **Pre-release** `vX.Y.Z` and merge the automatic `-SNAPSHOT` version-bump PR.
- [ ] Confirm the automatic [`Test - e2e`](../.github/workflows/test-e2e.yml) run triggered by `release: published` succeeded — including `testing/e2e/verify-e2e.ts` and all three Microsoft Security DevOps scans.
- [ ] *(Optional — if you have a disposable Windows SSH host configured)* Run synthetic E2E against `levain-pkgs` and/or any external catalog:
  ```bash
  deno task test:e2e:windows -- --levain-version X.Y.Z
  ```
  See [`testing/WINDOWS.md`](../testing/WINDOWS.md) for `--repo`, `--packages`, and `--verify` options.

---

## 2. Target Machine Setup

Use a **clean client Windows 10/11 machine** (or a fresh disposable local Windows user account if testing on a shared workstation):

- **Locale:** `pt-BR` recommended (exercises localized `pt-BR` CLI messages and accented characters).
- **Antivirus:** Windows Defender real-time protection **enabled** (no manual folder exclusion for `%USERPROFILE%\levain` or `%TEMP%`).
- **Clean state:** No pre-existing `%USERPROFILE%\levain`, `%USERPROFILE%\levain.config.json`, or `levain` entries in user `PATH`.

---

## 3. Manual Validation Checklist

Replace `X.Y.Z` below with the pre-release version being validated (for example, `1.1.0`).

### 3.1 Clean Install via `install.ps1` & Windows Defender Check

Open a standard Windows PowerShell terminal and run:

```powershell
$levainVersion = "X.Y.Z"
iwr "https://github.com/jmoalves/levain/releases/download/v$levainVersion/install.ps1" | iex
```

Verify:
- [ ] SHA-256 verification succeeds without errors.
- [ ] Windows Defender does **not** block or quarantine `levain.exe` during extraction, installation, or execution.
  > **If Defender flags `levain.exe`:** do **not** promote to `Latest`. Submit the binary as a false positive to [Microsoft Security Intelligence](https://www.microsoft.com/en-us/wdsi/filesubmission) and re-test after definition updates.
- [ ] Close the terminal, open a **fresh** PowerShell window, and run:
  ```powershell
  levain --version
  levain info --verbose
  levain list
  ```
- [ ] `levain --version` prints `X.Y.Z`, `levain info --verbose` shows `%USERPROFILE%\levain` and the configured repository, and `levain list` lists available recipes in the expected language.
- [ ] User `PATH` in `HKCU\Environment` contains `%USERPROFILE%\levain\levain` with no broken quotes or corrupted entries.

### 3.2 Package Installation & Shell Activation (PowerShell, CMD, Git Bash)

Install a representative toolchain (or equivalent recipes from your target catalog):

```powershell
levain install git jdk-21 maven
```

Verify across **fresh terminals** (to confirm `activateInit` hooks loaded automatically):

- [ ] **PowerShell (fresh window):**
  ```powershell
  levain activate git jdk-21 maven
  $env:LEVAIN_CURRENT
  $env:JAVA_HOME
  git --version
  java -version
  mvn -version
  ```
  Prompt displays the active Levain indicator, `LEVAIN_CURRENT` and `JAVA_HOME` are set, and all three tools execute cleanly.
- [ ] **Command Prompt (`cmd.exe`, fresh window):**
  ```cmd
  levain activate git jdk-21 maven
  echo %LEVAIN_CURRENT%
  echo %JAVA_HOME%
  git --version
  java -version
  mvn -version
  ```
  Prompt updates, variables are set, and all three tools execute cleanly.
- [ ] **Git Bash (fresh window):**
  ```bash
  levain activate git jdk-21 maven
  echo "$LEVAIN_CURRENT"
  echo "$JAVA_HOME"
  git --version
  java -version
  mvn -version
  ```
  Prompt updates, variables are set, and tools execute cleanly. *(If `levain` is not yet hooked in `~/.bashrc`, run `source "$HOME/levain/levain/levain.sh" activate git jdk-21 maven` and confirm `~/.bashrc` received the `# >>> levain initialize >>>` block.)*
- [ ] **Interactive `levain shell`:** run `levain shell git jdk-21`, verify `java -version` works inside the opened shell, and `exit` returns cleanly.

### 3.3 `levain update` & Self-Upgrade Readiness

- [ ] Run `levain update` (no arguments) — completes cleanly with `✓` for already up-to-date packages and noticeable fast-path behavior.
- [ ] *(Optional — upgrade path from `v0.x`)* If validating an upgrade from `v0.93.1` on an existing workstation, confirm `levain.config.json` repositories and installed `.levain\registry` entries are preserved and `levain info --verbose` reports the upgraded version cleanly.

### 3.4 Special-Character Credentials & Log Redaction

Create a temporary folder with a small test recipe `pw-test.levain.yaml` (delete the folder after the test):

```yaml
version: 1.0.0
levain.pkg.skipInstallDir: true
levain.pkg.skipRegistry: true
cmd.install:
  - echo "encoded=${levain.password | urlEncode}"
```

Run `levain install --tempRepo . pw-test` in that folder and enter a **dummy test password** containing URL/shell/template metacharacters (for example: `p@ss&w$1!%^(${HOME})`).

Verify:
- [ ] The password prompt masks input cleanly and handles backspace properly.
- [ ] `${HOME}` inside the password is **never** expanded as a Levain variable, and `| urlEncode` produces valid percent-encoding.
- [ ] Inspect the latest `%TEMP%\levain-*.log` file and confirm **neither the raw dummy password nor its URL-encoded form appears anywhere in the log**.

### 3.5 Two-Terminal Concurrency (`InstanceLock`)

Open two terminals side by side:

1. In **Terminal 1**, start a mutating command that takes a few seconds (for example, `levain install --force maven` or `levain update`).
2. While Terminal 1 is running, execute in **Terminal 2**:
   - Read-only commands: `levain list`, `levain info`, `levain actions`
   - Mutating command: `levain clean`

Verify:
- [ ] Read-only commands in Terminal 2 succeed immediately without waiting for Terminal 1.
- [ ] The mutating command (`levain clean`) in Terminal 2 fails cleanly after the lock timeout with an error showing the active process PID and command — and leaves `.levain\registry` and `levain.config.json` intact.
- [ ] Once Terminal 1 finishes, `levain clean` in Terminal 2 succeeds normally.

### 3.6 External / Custom Recipe Catalogs *(Optional)*

If you maintain external or internal recipe repositories:

- [ ] Add the repository (`levain list --tempRepo <url>` or `$levainRepo=<url>`) and verify no unexpected reserved-word errors (`levain` package/variable/env) or unknown `levain.*` YAML key warnings appear.
- [ ] Install and activate one real project `.levain.yaml` from that catalog and confirm the project builds/runs as expected.

### 3.7 Playbooks & Complete Clean Uninstall (`levain explain --uninstall`)

- [ ] Generate a setup playbook and inspect it:
  ```powershell
  levain explain maven > setup-guide.md
  ```
  Confirm `setup-guide.md` starts cleanly with `# ` Markdown (no `[INFO]`/`[DEBUG]` log noise) and contains no secrets.
- [ ] Generate the full uninstall guide:
  ```powershell
  levain explain --uninstall > uninstall-guide.md
  ```
  Confirm `uninstall-guide.md` lists installed packages in reverse dependency order with `levain` last, includes the **Final Levain cleanup** section, and contains valid commands.
- [ ] Execute the cleanup steps from `uninstall-guide.md` on the test machine/account, open a **fresh** terminal, and verify:
  - `levain` is no longer found on `PATH`;
  - `%USERPROFILE%\levain` and `%USERPROFILE%\levain.config.json` are gone;
  - No leftover Levain hooks remain in PowerShell profile, `HKCU\Software\Microsoft\Command Processor` (`AutoRun`), Desktop, Start Menu, or Explorer context menu.

---

## 4. Go / No-Go Sign-Off & Promotion to `Latest`

| Area | Status | Notes |
| :--- | :---: | :--- |
| Automated CI (`Unit tests` + `Test - e2e` + MSDO) | [ ] Pass | |
| Clean `install.ps1` + Windows Defender | [ ] Pass | |
| Activation (PowerShell, CMD, Git Bash) & tools | [ ] Pass | |
| Special-character password & log redaction | [ ] Pass | |
| 2-terminal concurrency (`InstanceLock`) | [ ] Pass | |
| `explain` + `explain --uninstall` cleanup | [ ] Pass | |

**Only after every item passes:**

1. Open the Pre-release `vX.Y.Z` in **GitHub Releases → Edit**.
2. Uncheck **Set as a pre-release** and check **Set as the latest release**.
3. Save and verify the default one-liner on a clean shell:
   ```powershell
   iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
   ```
