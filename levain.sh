#!/bin/bash

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "$LEVAIN_EXE" && -f "$LEVAIN_EXE" ]]; then
    __levain_exe="$LEVAIN_EXE"
elif [[ -f "$script_dir/build/levain.exe" ]]; then
    __levain_exe="$script_dir/build/levain.exe"
else
    __levain_exe="$script_dir/scripts/levain-deno.cmd"
fi

cmd="$1"
shift

if [[ "$cmd" == "activate" ]]; then
    "$__levain_exe" _activate-machine pre "$@"
    eval "$("$__levain_exe" _activate-machine cmd --shell bash "$@")"
else
    "$__levain_exe" "$cmd" "$@"
fi
