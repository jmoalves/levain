# Windows test VM

Levain is a Windows tool: `OsUtils.onlyInWindows()`, registry actions, PowerShell,
Windows-only CI. A test run on Linux silently skips a large part of the suite, so
this VM is where the suite is actually validated — for `master` (Deno 1) and for
the `deno2_opus` migration branch.

## Host (Ubuntu 24.04, KVM)

```bash
./levain-vm.sh deps                      # qemu-kvm, libvirt, ovmf, swtpm
./levain-vm.sh create ~/iso/Win11.iso    # UEFI + TPM 2.0, boots the installer
```

## The Windows ISO, and reproducing this elsewhere

The ISO is **not** committed, mirrored into the repository or redistributed —
it is Microsoft's to distribute, and it is several GB. What makes a run
reproducible is the *identity* of the image, recorded here:

| | |
|---|---|
| File | `Win11_25H2_BrazilianPortuguese_x64_v2.iso` |
| Edition | Windows 11, version 25H2, multi-edition retail (install **Pro**) |
| Language | Brazilian Portuguese (pt-BR) — matches the machines Levain's users run |
| Architecture | x64 |
| Size | 8172068864 bytes |
| SHA-256 | `50fe4703cf0df0072e093d1f5d58ed450e4c49d8ca960433bbe6278d5ef10107` |

`levain-vm.sh create` verifies the file against `ISO_SHA256` before building the
VM, so a different build, language or edition fails loudly instead of producing
a machine that behaves subtly differently.

### Which edition

Use **Windows 11 Pro**, installed from the multi-edition retail ISO. Not Home.

For what Levain actually touches — HKCU, the user PATH, shortcuts in the user
profile, the file system, processes — Home behaves the same as Pro. The reasons
to avoid it are elsewhere:

- Home forces a Microsoft account and an internet connection during setup, and
  recent builds removed the usual escapes. A disposable VM that is supposed to
  be rebuilt from a recorded procedure should not depend on signing in. In Pro,
  *Sign-in options -> Domain join instead* still creates a local account.
- Group Policy, domain join and the policy-driven restrictions that shape
  corporate machines simply do not exist in Home, so it cannot represent the
  environment Levain's real users run in.

The consumer Windows 11 ISO is multi-edition: choosing *I don't have a product
key* during setup lets you pick Pro from the same download. Left unactivated it
runs indefinitely for testing - it only nags and blocks personalization.

Enterprise is not worth chasing for this. The retail download page offers it
only through a Microsoft 365 tenant, a Visual Studio subscription or the Insider
programme, and the Evaluation Center ISO (25H2, 90 days, no key) needs
registration and expects a Microsoft account sign-in. For everything Levain
touches, Pro and Enterprise behave the same.

Neither edition matches CI exactly — `windows-latest` is Windows Server, not a
client Windows. That is fine and is the point of having both: CI covers the
clean server case, the VM covers the client environment Levain is actually
installed on.

Ways to obtain that exact file:

- The multi-edition Windows 11 ISO from Microsoft's download page (see *Which
  edition* above).
- A tool that automates the official download (`mido`, `quickget`) when you want
  the fetch itself scripted rather than done through a browser.

Keeping a local copy on a NAS is fine and is just a cache — anyone else
reproduces the environment from the table above plus this script, and the hash
check proves they got the same image. What must never be the source of truth is
"the file on someone's NAS".

The authoritative environment stays GitHub Actions `windows-latest`. This VM is
a fast local approximation of it, not a replacement: before a release, the CI
run is what counts.

Sizing defaults to 4 vCPU / 8 GB / 80 GB, enough for the unit suite. The e2e
"install EVERYTHING" job needs far more disk; leave that one on GitHub Actions.

## Two directories, and why backups trip over them

The VM lives in two places on purpose: the disks in `~/vms` (NVMe, where test
runs need the I/O) and the ISO in `/storage/home/<user>/vms` (the big disk, read
once during setup). Both need to stay out of backups, and each needs its own
marker - `.resticignore` and `.kopiaignore` in each directory, plus the path in
`RSYNC_EXCLUDES` for the host, since rsync has no per-directory marker.

There is a second reason beyond size. While the domain exists, libvirt's DAC
driver chowns the disk image *and the ISO* to the qemu user (`libvirt-qemu:kvm`
here), so your own user can no longer read them. A backup tool that walks those
directories does not merely copy gigabytes for nothing - it fails outright with
`permission denied`. Ownership goes back when the domain is destroyed, but the
exclusions are what keep the backup green in the meantime.

Once Windows is installed, detaching the install CD-ROM releases the ISO:

```bash
virsh --connect qemu:///system detach-device-alias levain-win11 sata0-0-1 --config
```

## Inside Windows

0. At the first boot the firmware asks to *press any key to boot from CD or
   DVD*. Miss that window and the VM sits at an empty prompt doing nothing -
   which looks exactly like a broken install.
1. **Local account**, no Microsoft account. Reproducibility matters more than
   convenience, and Levain writes to the user profile.
2. **Leave Windows Defender on.** Defender blocking `levain.exe` is a real,
   recurring release problem (see *Releasing* in CLAUDE.md) — a VM with Defender
   disabled would hide it.
3. **OpenSSH Server**, so the whole cycle can be driven from the Linux host:
   ```powershell
   Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
   Set-Service sshd -StartupType Automatic; Start-Service sshd
   ```
   Then from the host: `ssh <user>@<vm-ip> "cd levain-master && scripts\test.cmd"`.
4. **Git**: `winget install --id Git.Git -e`.
5. **One clone per branch** — `bin\` and `extra-bin\` are untracked per-clone
   state, and each branch needs a different Deno:
   ```cmd
   git clone https://github.com/jmoalves/levain.git levain-master
   git clone -b deno2_opus https://github.com/jmoalves/levain.git levain-deno2

   cd levain-master && scripts\devLevain.cmd 1.46.3
   cd levain-deno2  && scripts\devLevain.cmd 2.9.6
   ```
   Sharing one clone between branches means testing one branch with the other's
   `deno.exe` — exactly the kind of false positive this VM exists to avoid.
6. **Never run the suite from a shared folder.** virtiofs/vboxsf change
   permission, read-only and timestamp semantics; `file_utils` and the copy /
   backup actions depend on those. Clone inside the VM.

## Running

```cmd
scripts\test.cmd --checkSources          :: same entry point the CI job uses
scripts\test.cmd -- --filter "Registry"  :: single test while iterating
```

## Reset discipline

The suite mutates the machine: `addPath`, `setEnv --permanent`, `contextMenu`,
`addToDesktop`, `addToStartup` write to HKCU, the PATH and the user profile. One
run contaminates the next, which shows up as tests that pass or fail depending on
what ran before.

```bash
./levain-vm.sh freeze    # once, after Windows is installed and configured
./levain-vm.sh reset     # before each full run (VM shut down)
```

`freeze` flattens the installed disk into a read-only base image; `reset` throws
the overlay away and recreates it. Cheap, and immune to the UEFI/nvram quirks of
libvirt internal snapshots.
