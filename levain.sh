#!/bin/bash

__levain_upgrade() {
    local base_dir="$1"
    local temp_root="${TEMP:-${TMPDIR:-/tmp}}"
    local target_file="$temp_root/levain/upgrade-target.txt"
    local levain_dir=""
    local line

    echo ""
    echo "LEVAIN UPGRADE!"
    echo ""

    if [[ -f "$target_file" ]]; then
        while IFS= read -r line || [[ -n "$line" ]]; do
            line="${line%$'\r'}"
            if [[ "$line" =~ ^levain-[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ -f "$temp_root/levain/$line/levain.cmd" ]]; then
                levain_dir="$temp_root/levain/$line"
                break
            fi
        done < "$target_file"
        rm -f "$target_file" >/dev/null 2>&1 || true
    fi

    if [[ -z "$levain_dir" ]]; then
        echo ""
        echo "No new version found"
        return 1
    fi

    if command -v cmd.exe >/dev/null 2>&1; then
        local win_cmd win_home
        if command -v cygpath >/dev/null 2>&1; then
            win_cmd="$(cygpath -w "$levain_dir/levain.cmd")"
            win_home="$(cygpath -w "$(dirname "$base_dir")")"
        else
            win_cmd="$levain_dir/levain.cmd"
            win_home="$(dirname "$base_dir")"
        fi
        cmd.exe //c start //max "Levain Upgrade" cmd //c "\"\"$win_cmd\" \"--levainHome=$win_home\" --levain-upgrade\""
    else
        "$levain_dir/levain.sh" "--levainHome=$(dirname "$base_dir")" --levain-upgrade || return $?
    fi

    echo ""
    echo "After Levain upgrade, please re-execute your previous command."
    echo ""
    return 0
}

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
        rc=$?
        if [[ $rc -eq 42 ]]; then
            __levain_upgrade "$script_dir"
            return $?
        fi
        return $rc
    fi

    cmd="$1"
    shift

    if [[ "$cmd" == "activate" ]]; then
        local skip_pre=0
        local -a activate_args=()
        local arg
        for arg in "$@"; do
            if [[ "$arg" == "--skip-pre" ]]; then
                skip_pre=1
            else
                activate_args+=("$arg")
            fi
        done
        if [[ $skip_pre -eq 0 ]]; then
            "$__levain_exe" _activate-machine pre ${activate_args[@]+"${activate_args[@]}"}
            rc=$?
            if [[ $rc -eq 42 ]]; then
                __levain_upgrade "$script_dir"
                return $?
            fi
            if [[ $rc -ne 0 ]]; then
                return $rc
            fi
        fi
        script="$("$__levain_exe" _activate-machine cmd --shell bash ${activate_args[@]+"${activate_args[@]}"})"
        rc=$?
        if [[ $rc -ne 0 ]]; then
            return $rc
        fi
        if [[ -n "$script" ]]; then
            eval "$script"
        fi
    else
        "$__levain_exe" "$cmd" "$@"
        rc=$?
        if [[ $rc -eq 42 ]]; then
            __levain_upgrade "$script_dir"
            return $?
        fi
        return $rc
    fi
}

__levain_main "$@"
__levain_rc=$?
unset -f __levain_main __levain_upgrade

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
    return "$__levain_rc"
fi
exit "$__levain_rc"
