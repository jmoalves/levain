#!/usr/bin/env bash
#
# Windows test VM for Levain, on KVM/QEMU.
#
# The VM uses a read-only base image plus a disposable overlay: "reset" throws
# the overlay away and recreates it, so every test run starts from the exact
# same Windows state. Levain's test suite writes to the registry, PATH, the
# Desktop and the Start Menu, so a clean state per run is not optional.
#
#   ./levain-vm.sh deps                  # host packages (asks for sudo)
#   ./levain-vm.sh create <windows.iso>  # create the VM and boot the installer
#   ./levain-vm.sh freeze                # turn the installed VM into the base image
#   ./levain-vm.sh reset                 # back to the frozen state
#   ./levain-vm.sh start | stop | ip
#
set -euo pipefail

VM_NAME="${VM_NAME:-levain-win11}"
VM_RAM_MB="${VM_RAM_MB:-8192}"
VM_VCPUS="${VM_VCPUS:-4}"
VM_DISK_GB="${VM_DISK_GB:-80}"
VM_DIR="${VM_DIR:-$HOME/vms/$VM_NAME}"
# Optional: path to virtio-win.iso enables virtio disk/net (faster, extra driver
# step during setup). Without it the VM uses SATA + e1000e, which Windows
# installs with no extra drivers.
VIRTIO_ISO="${VIRTIO_ISO:-}"
# Identity of the Windows ISO this environment is pinned to. The ISO itself is
# never committed or redistributed - the hash is what makes a run reproducible
# somewhere else. Override to move to another Windows build, and record it.
ISO_SHA256="${ISO_SHA256:-}"

# Pin the connection: without this, virt-install and virsh silently fall back to
# qemu:///session when the caller is not (yet) in the libvirt group, and the VM
# would be created somewhere else than where the default network lives.
export LIBVIRT_DEFAULT_URI="${LIBVIRT_DEFAULT_URI:-qemu:///system}"

BASE_IMG="$VM_DIR/base.qcow2"
OVERLAY_IMG="$VM_DIR/overlay.qcow2"

die() { echo "ERROR: $*" >&2; exit 1; }

# Membership in the libvirt group only applies to a new login session. When the
# user is already a member but this shell is not, re-exec under sg rather than
# asking them to log out.
ensure_libvirt_group() {
    id -nG | tr ' ' '\n' | grep -qx libvirt && return 0
    getent group libvirt | cut -d: -f4 | tr ',' '\n' | grep -qx "$USER" || return 0
    [ -n "${LEVAIN_VM_SG:-}" ] && die "the libvirt group did not apply - log out and back in"

    echo "=== Re-running under the libvirt group"
    export LEVAIN_VM_SG=1
    exec sg libvirt -c "$(printf '%q ' "$0" "$@")"
}

# qemu does not run as you: it runs as its own user (libvirt-qemu on Debian and
# Ubuntu, qemu on Fedora), which cannot traverse a 750 home directory, so the VM
# disk and the ISO simply look missing to it. Grant that single user the minimum
# with an ACL, instead of opening these directories to everyone with chmod o+x.
qemu_user() {
    local u
    for u in libvirt-qemu qemu; do
        id -u "$u" >/dev/null 2>&1 && { echo "$u"; return 0; }
    done
    return 1
}

grant_traverse() {
    local user="$1" p
    p="$(readlink -f "$2")"
    while [ "$p" != "/" ]; do
        # Only what we own can take an ACL; anything else is normally
        # world-traversable already (/home, /storage/home).
        [ -O "$p" ] && setfacl -m "u:$user:x" "$p"
        p="$(dirname "$p")"
    done
}

grant_qemu_access() {
    local iso="$1" user
    user="$(qemu_user)" || { echo "WARN - no qemu user found, skipping ACLs"; return 0; }
    command -v setfacl >/dev/null 2>&1 || die "setfacl not found - install the 'acl' package"

    setfacl -m "u:$user:r" "$iso"
    grant_traverse "$user" "$(dirname "$iso")"

    setfacl -R -m "u:$user:rwX" "$VM_DIR"
    # Default ACL, so the overlay that 'reset' recreates inherits the access.
    setfacl -d -m "u:$user:rwX" "$VM_DIR"
    grant_traverse "$user" "$VM_DIR"
}

# Getting root without a terminal: this script is meant to be runnable from an
# automated context, where sudo has no TTY to ask for a password on. With a
# graphical session, ask through zenity; otherwise say so plainly.
ensure_sudo() {
    sudo -n true 2>/dev/null && return 0
    if [ -t 0 ]; then
        sudo -v && return 0
    fi
    [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] && command -v zenity >/dev/null 2>&1 \
        || die "sudo needs a password and there is no terminal - run this from a terminal"

    local helper rc
    helper="$(mktemp)"
    printf '#!/bin/sh\nexec zenity --password --title="sudo - levain-vm.sh"\n' > "$helper"
    chmod +x "$helper"
    echo "=== Asking for your password in a dialog on the desktop"
    SUDO_ASKPASS="$helper" sudo -A -v
    rc=$?
    rm -f "$helper"
    [ $rc -eq 0 ] || die "sudo authentication failed"
}

cmd_deps() {
    ensure_sudo
    sudo apt update
    sudo apt install -y \
        qemu-kvm libvirt-daemon-system libvirt-clients virtinst virt-manager \
        ovmf swtpm swtpm-tools qemu-utils libosinfo-bin
    sudo usermod -aG libvirt,kvm "$USER"
    sudo virsh net-autostart default || true
    sudo virsh net-start default 2>/dev/null || true
    echo
    echo "=== Log out and back in (or: newgrp libvirt) for the group change to apply."
}

cmd_create() {
    local iso="${1:-}"
    [ -n "$iso" ] || die "usage: $0 create <windows.iso>"
    [ -f "$iso" ] || die "ISO not found: $iso"
    if [ -n "$ISO_SHA256" ]; then
        echo "=== Checking the ISO against the pinned hash"
        echo "$ISO_SHA256  $iso" | sha256sum --check --strict \
            || die "ISO does not match ISO_SHA256 - wrong build, language or edition"
    else
        echo "WARN - ISO_SHA256 not set, cannot tell which Windows build this is."
        echo "WARN - Record it:  sha256sum '$iso'"
    fi
    mkdir -p "$VM_DIR"
    [ -f "$OVERLAY_IMG" ] && die "$OVERLAY_IMG already exists - remove it first"

    qemu-img create -f qcow2 "$OVERLAY_IMG" "${VM_DISK_GB}G"

    local disk_bus=sata net_model=e1000e extra_cdrom=()
    if [ -n "$VIRTIO_ISO" ]; then
        [ -f "$VIRTIO_ISO" ] || die "VIRTIO_ISO not found: $VIRTIO_ISO"
        disk_bus=virtio
        net_model=virtio
        extra_cdrom=(--disk "path=$VIRTIO_ISO,device=cdrom,readonly=on")
    fi

    grant_qemu_access "$iso"

    # Windows 11 requires UEFI + TPM 2.0 - without both, setup refuses to run.
    virt-install \
        --name "$VM_NAME" \
        --memory "$VM_RAM_MB" \
        --vcpus "$VM_VCPUS" \
        --cpu host-passthrough \
        --machine q35 \
        --boot uefi \
        --tpm backend.type=emulator,backend.version=2.0,model=tpm-crb \
        --disk "path=$OVERLAY_IMG,format=qcow2,bus=$disk_bus" \
        --cdrom "$iso" \
        "${extra_cdrom[@]}" \
        --network network=default,model="$net_model" \
        --graphics spice \
        --video qxl \
        --osinfo win11 \
        --noautoconsole

    echo
    echo "=== Installer running. Open the console with:  virt-manager"
    echo "=== Then follow WINDOWS-VM.md and finish with: $0 freeze"
}

cmd_freeze() {
    [ -f "$OVERLAY_IMG" ] || die "no overlay at $OVERLAY_IMG - run 'create' first"
    virsh domstate "$VM_NAME" | grep -q "shut off" \
        || die "shut the VM down from inside Windows first"
    [ -f "$BASE_IMG" ] && die "$BASE_IMG already exists - delete it to re-freeze"

    echo "=== Flattening the installed disk into the base image (may take a while)"
    qemu-img convert -O qcow2 "$OVERLAY_IMG" "$BASE_IMG"
    chmod a-w "$BASE_IMG"
    rm -f "$OVERLAY_IMG"
    cmd_reset
}

cmd_reset() {
    [ -f "$BASE_IMG" ] || die "no base image - run 'freeze' after installing Windows"
    virsh domstate "$VM_NAME" 2>/dev/null | grep -q running \
        && die "VM is running - '$0 stop' first"

    rm -f "$OVERLAY_IMG"
    qemu-img create -f qcow2 -b "$BASE_IMG" -F qcow2 "$OVERLAY_IMG"
    # The domain keeps pointing at the overlay path, so nothing else to update.
    echo "=== Clean state restored from $BASE_IMG"
}

cmd_start() { virsh start "$VM_NAME"; }
cmd_stop()  { virsh shutdown "$VM_NAME"; }

cmd_ip() {
    virsh domifaddr "$VM_NAME" --source agent 2>/dev/null \
        || virsh domifaddr "$VM_NAME"
}

# Before dispatching, and with the original arguments still intact, so the
# re-exec below repeats the same command.
case "${1:-}" in
    create|freeze|reset|start|stop|ip) ensure_libvirt_group "$@" ;;
esac

case "${1:-}" in
    deps)   shift; cmd_deps "$@" ;;
    create) shift; cmd_create "$@" ;;
    freeze) shift; cmd_freeze "$@" ;;
    reset)  shift; cmd_reset "$@" ;;
    start)  shift; cmd_start "$@" ;;
    stop)   shift; cmd_stop "$@" ;;
    ip)     shift; cmd_ip "$@" ;;
    *) sed -n '2,20p' "$0"; exit 1 ;;
esac
