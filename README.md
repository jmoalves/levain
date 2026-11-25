# Levain [![Github Created At](https://img.shields.io/github/created-at/jmoalves/levain)](https://github.com/jmoalves/levain) [![Release](https://img.shields.io/github/v/release/jmoalves/levain) ![GitHub Release Date](https://img.shields.io/github/release-date/jmoalves/levain?display_date=published_at&label=%20)](https://github.com/jmoalves/levain/releases/latest)

[![Check sources](https://github.com/jmoalves/levain/actions/workflows/checkSources.yml/badge.svg)](https://github.com/jmoalves/levain/actions/workflows/checkSources.yml)
[![Unit tests](https://github.com/jmoalves/levain/actions/workflows/test-unit.yml/badge.svg)](https://github.com/jmoalves/levain/actions/workflows/test-unit.yml)
[![codecov](https://codecov.io/gh/jmoalves/levain/graph/badge.svg?token=24E0G0XZNF)](https://codecov.io/gh/jmoalves/levain)
[![Test - e2e](https://github.com/jmoalves/levain/actions/workflows/test-e2e.yml/badge.svg)](https://github.com/jmoalves/levain/actions/workflows/test-e2e.yml)

_Something to help you make your software grow._

Levain is a declarative development environment installer and shell manager powered by YAML recipes (`*.levain.yaml`). Define the tools, versions, and environment variables your projects need once, then install, update, activate, or export a manual setup guide for any machine.

---

## Installing Levain (Windows PowerShell)

Install the latest release to `$HOME\levain` using `install.ps1`:

```powershell
iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
```

You can combine optional PowerShell variables before piping to `iex`:

| Variable | Purpose | Example |
| :--- | :--- | :--- |
| `$levainHome` | Custom installation directory | `$levainHome="C:\dev-env"` |
| `$levainRepo` | Custom recipes repository (default: [`jmoalves/levain-pkgs`](https://github.com/jmoalves/levain-pkgs)) | `$levainRepo="https://git.example.org/team/levain-pkgs.git"` |
| `$levainUrlBase` | Mirror / proxy base URL for Levain releases | `$levainUrlBase="https://mirror.example.org/github-proxy/jmoalves/levain"` |
| `$levainVersion` | Pin a specific Levain release | `$levainVersion="1.1.0"` |
| `$levainHeadless` | Non-interactive install (for CI or automation) | `$levainHeadless="true"` |

Example combining a custom home directory and recipe catalog:

```powershell
$levainHome="C:\dev-env"; $levainRepo="https://git.example.org/team/levain-pkgs.git"; iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
```

---

## Quick Start — Documentation Lives Inside Levain

Levain is designed to be **self-documenting** from the terminal (in English and Brazilian Portuguese), so you rarely need an external manual:

```bash
levain --help                        # Overview of commands, flags, and examples
levain <command> --help              # Detailed options and examples for any command
levain list jdk                      # Search available packages
levain install jdk maven             # Install packages and their dependencies
levain activate                      # Load the current project's .levain.yaml in your terminal
levain explain maven > guide.md      # Generate a manual step-by-step Markdown setup guide
levain actions copy                  # Inspect recipe actions and their usage syntax
```

### Core Commands

| Command | What it does |
| :--- | :--- |
| `levain list [search...]` | List available recipes (optionally filtered). |
| `levain install [packages...]` | Install packages and dependencies (defaults to `./.levain.yaml`). |
| `levain update [packages...]` | Refresh repositories and update installed or specified packages. |
| `levain activate [packages...]` | Activate a Levain environment directly in your current shell (`cmd`, PowerShell, Git Bash, Cmder). |
| `levain shell [packages...]` | Open a new configured interactive shell (defaults to `./.levain.yaml`). |
| `levain explain [--raw] [packages...]` | Emit a clean Markdown manual setup playbook so you are never locked into Levain. |
| `levain info [--verbose] [packages...]` | Inspect Levain status, repository paths, and dependency resolution order. |
| `levain actions [search...]` | Browse all recipe actions with descriptions and usage syntax. |
| `levain clone [--dirs] <url>` | Clone a Git repository and open its configured Levain shell. |
| `levain clean [--all] [--deep]` | Clean old backups, temporary files, logs, or download cache. |

---

## Platform Support & Branches

- **Platforms:** Windows (`x86_64`) is the primary target and ships as a single compiled `levain.exe` wrapped by `levain.cmd`, `levain.ps1`, and `levain.sh`. macOS and Linux support is part of the core architecture (`levain.sh` + OS-scoped recipe blocks `cmd.<stage>.{posix,windows,linux,darwin}`).
- **`master`:** Active **Levain v1 (Deno 2)** codebase (stabilizing toward `v1.1.0`).
- **`v0.x`:** Maintenance branch for legacy **Levain v0 (Deno 1.46.3)** hotfixes.

---

## Contributing, Maintaining & Security

- **Contributing & local setup:** [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **Architecture & release runbook (maintainers):** [`docs/MAINTAINING.md`](docs/MAINTAINING.md)
- **Windows testing matrix (CI, SSH, Sandbox, local):** [`testing/WINDOWS.md`](testing/WINDOWS.md)
- **AI assistant & repository engineering guidelines:** [`AGENTS.md`](AGENTS.md)
- **Stabilization roadmap:** [`ROADMAP.md`](ROADMAP.md)
- **Security policy:** [`SECURITY.md`](SECURITY.md)
