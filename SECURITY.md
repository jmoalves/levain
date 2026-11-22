# Security Policy

## Supported Versions

| Version / Branch | Supported | Notes |
| :--- | :---: | :--- |
| `master` (`v1.0.x` pre-releases, Deno 2) | Yes | Active stabilization line |
| `v0.x` (`v0.93.x`, Deno 1.46.3) | Hotfixes | Current `Latest` release line until v1 is promoted |
| `deno2_opus` | No | Historical migration branch (obsolete) |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report security issues privately using **GitHub Security Advisories** (*Security* tab → *Report a vulnerability* on the repository) or by contacting the repository maintainers directly. Include:

- A clear description of the issue and affected component/command/action.
- Steps to reproduce or a minimal proof of concept.
- Potential impact (e.g., credential disclosure, command injection, tampered download).

We will acknowledge receipt and coordinate a fix before public disclosure.

## Security Model & Operational Notes

Levain is a **developer workstation provisioning CLI** for Windows. Keep the following properties in mind when running or maintaining it:

1. **Broad runtime permissions (`--allow-all`):** Levain is compiled and executed with `--allow-all` because installation recipes legitimately write to user directories, modify Windows Registry (`HKCU`), update `PATH`, download archives, and spawn child processes.
2. **Trust boundary for recipes (`*.levain.yaml`):** Recipes execute arbitrary shell and filesystem actions (`cmd.install`, `cmd.env`, `levainShell`). Only add recipe repositories (`--addRepo`, `--tempRepo`, `$levainRepo`) that you trust.
3. **Credential handling:** Passwords prompted via `UserInfoUtil` are kept in memory for the current run and masked in log output (`LogUtils.hidePassword`), but recipes that pass `${levain.password}` to child commands should still be audited carefully.
4. **Download & build integrity:**
   - `install/install.ps1` verifies the `.sha256` checksum of `levain-windows-x86_64.zip` before extraction.
   - Release builds verify GitHub Release SHA-256 digests when bundling third-party binaries (`MinGit`, `7-Zip`), use TLS verification (`curl -fsSL`), pin GitHub Actions by commit SHA, and enforce reproducible Deno dependencies via `deno.lock` (`--frozen`).
5. **Windows Defender:** Newly compiled `levain.exe` binaries may trigger false-positive heuristics in Windows Defender or enterprise EDR tools. Always verify the published `.sha256` checksum and validate pre-releases on a clean Windows machine with Defender enabled before promoting to `Latest`.
