#!/bin/bash

__levain_upgrade() {
    local base_dir="$1"
    local temp_root="${TEMP:-${TMPDIR:-${TMP:-/tmp}}}"
    local target_file="$temp_root/levain/upgrade-target.txt"
    local levain_dir=""
    local line

    echo ""
    echo "LEVAIN UPGRADE!"
    echo ""

    if [[ -f "$target_file" ]]; then
        while IFS= read -r line || [[ -n "$line" ]]; do
            line="${line%$'\r'}"
            if [[ "$line" =~ ^levain-[0-9]+\.[0-9]+\.[0-9]+$ ]] && \
               [[ -f "$temp_root/levain/$line/levain.cmd" || -f "$temp_root/levain/$line/levain.sh" ]]; then
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

    if command -v cmd.exe >/dev/null 2>&1 && [[ -f "$levain_dir/levain.cmd" ]]; then
        local win_cmd win_home
        if command -v cygpath >/dev/null 2>&1; then
            win_cmd="$(cygpath -w "$levain_dir/levain.cmd")"
            win_home="$(cygpath -w "$(dirname "$base_dir")")"
        else
            win_cmd="$levain_dir/levain.cmd"
            win_home="$(dirname "$base_dir")"
        fi
        cmd.exe //c start //max "Levain Upgrade" cmd //c "\"\"$win_cmd\" \"--levainHome=$win_home\" --levain-upgrade\""
    elif [[ -f "$levain_dir/levain.sh" ]]; then
        bash "$levain_dir/levain.sh" "--levainHome=$(dirname "$base_dir")" --levain-upgrade || return $?
    else
        echo "Upgrade entrypoint not found in $levain_dir" >&2
        return 1
    fi

    echo ""
    echo "After Levain upgrade, please re-execute your previous command."
    echo ""
    return 0
}

__levain_run() {
    local script_dir="$1"
    shift

    if [[ -n "${LEVAIN_EXE:-}" && -f "$LEVAIN_EXE" ]]; then
        "$LEVAIN_EXE" "$@"
    elif [[ -f "$script_dir/build/levain" && -x "$script_dir/build/levain" ]]; then
        "$script_dir/build/levain" "$@"
    elif [[ -f "$script_dir/build/levain.exe" ]]; then
        "$script_dir/build/levain.exe" "$@"
    elif [[ -f "$script_dir/build/deno.exe" && -f "$script_dir/build/levain.bundle.js" ]]; then
        local bundle_path="$script_dir/build/levain.bundle.js"
        if command -v cygpath >/dev/null 2>&1; then
            bundle_path="$(cygpath -w "$bundle_path")"
        fi
        DENO_NO_UPDATE_CHECK=true "$script_dir/build/deno.exe" run --no-check --cached-only --allow-all "$bundle_path" --is_bundled_js "$@"
    elif [[ -f "$script_dir/build/levain.bundle.js" ]] && command -v deno >/dev/null 2>&1; then
        DENO_NO_UPDATE_CHECK=true deno run --no-check --cached-only --allow-all "$script_dir/build/levain.bundle.js" --is_bundled_js "$@"
    elif command -v deno >/dev/null 2>&1; then
        if [[ -f "$script_dir/deno.json" ]]; then
            deno run --allow-all --config "$script_dir/deno.json" "$script_dir/levain.ts" "$@"
        else
            deno run --allow-all "$script_dir/levain.ts" "$@"
        fi
    elif command -v cmd.exe >/dev/null 2>&1 && [[ -f "$script_dir/scripts/levain-deno.cmd" ]]; then
        "$script_dir/scripts/levain-deno.cmd" "$@"
    else
        echo "Error: Could not find compiled Levain binary or 'deno' in PATH." >&2
        return 127
    fi
}

__levain_main() {
    local script_dir cmd script rc
    script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

    if [[ $# -eq 0 ]]; then
        __levain_run "$script_dir"
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
            if [[ "$arg" == "--help" || "$arg" == "-h" ]]; then
                __levain_run "$script_dir" "$cmd" "$@"
                return $?
            fi
        done
        for arg in "$@"; do
            if [[ "$arg" == "--skip-pre" ]]; then
                skip_pre=1
            else
                activate_args+=("$arg")
            fi
        done
        if [[ $skip_pre -eq 0 ]]; then
            __levain_run "$script_dir" _activate-machine pre ${activate_args[@]+"${activate_args[@]}"}
            rc=$?
            if [[ $rc -eq 42 ]]; then
                __levain_upgrade "$script_dir"
                return $?
            fi
            if [[ $rc -ne 0 ]]; then
                return $rc
            fi
        fi
        script="$(__levain_run "$script_dir" _activate-machine cmd --shell bash ${activate_args[@]+"${activate_args[@]}"})"
        rc=$?
        if [[ $rc -ne 0 ]]; then
            return $rc
        fi
        if [[ -n "$script" ]]; then
            eval "$script"
        fi
    else
        __levain_run "$script_dir" "$cmd" "$@"
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
unset -f __levain_main __levain_run __levain_upgrade

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
    return "$__levain_rc"
fi
exit "$__levain_rc"
