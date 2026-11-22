#!/bin/bash

__levain_main() {
    local script_dir __levain_exe cmd script rc
    script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

    if [[ -n "${LEVAIN_EXE:-}" && -f "$LEVAIN_EXE" ]]; then
        __levain_exe="$LEVAIN_EXE"
    elif [[ -f "$script_dir/build/levain.exe" ]]; then
        __levain_exe="$script_dir/build/levain.exe"
    else
        __levain_exe="$script_dir/scripts/levain-deno.cmd"
    fi

    if [[ $# -eq 0 ]]; then
        "$__levain_exe"
        return $?
    fi

    cmd="$1"
    shift

    if [[ "$cmd" == "activate" ]]; then
        "$__levain_exe" _activate-machine pre "$@" || return $?
        script="$("$__levain_exe" _activate-machine cmd --shell bash "$@")"
        rc=$?
        if [[ $rc -ne 0 ]]; then
            return $rc
        fi
        if [[ -n "$script" ]]; then
            eval "$script"
        fi
    else
        "$__levain_exe" "$cmd" "$@"
    fi
}

__levain_main "$@"
__levain_rc=$?
unset -f __levain_main

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
    return "$__levain_rc"
fi
exit "$__levain_rc"
