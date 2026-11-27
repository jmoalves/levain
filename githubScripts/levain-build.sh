#!/bin/bash
set -euo pipefail

myDeno=${1:-}
levainSrcDir=${2:-}
targetDir=${3:-}
buildMode=${4:-compile}
windowsDenoExe=${5:-}

if [ -z "$myDeno" ] || [ -z "$levainSrcDir" ] || [ -z "$targetDir" ]; then
    echo "Usage: $0 <deno-executable> <levain-src-dir> <target-dir> [compile|bundle] [windows-deno-exe]" >&2
    exit 1
fi

if [ ! -x "$myDeno" ]; then
    echo "Cannot execute deno binary at '$myDeno'" >&2
    exit 1
fi

if [ "$buildMode" != "compile" ] && [ "$buildMode" != "bundle" ]; then
    echo "Invalid buildMode '${buildMode}'. Expected 'compile' or 'bundle'." >&2
    exit 1
fi

if [ "$buildMode" = "bundle" ]; then
    if [ -z "$windowsDenoExe" ] || [ ! -f "$windowsDenoExe" ]; then
        echo "Bundle mode requires a valid Windows deno.exe path as 5th argument (got: '${windowsDenoExe}')." >&2
        exit 1
    fi
fi

levainSrcDir="$(cd "${levainSrcDir}" && pwd)"
mkdir -p "$(dirname "${targetDir}")"
targetDir="$(cd "$(dirname "${targetDir}")" && pwd)/$(basename "${targetDir}")"

levainCompile() {
    # https://stackoverflow.com/questions/16654607/using-getopts-inside-a-bash-function
    local OPTIND OPTARG o target="" output=""

    while getopts "t:o:" o; do
        case "${o}" in
            t) target="${OPTARG}" ;;
            o) output="${OPTARG}" ;;
            *)
                echo "Invalid option in levainCompile" >&2
                exit 1
                ;;
        esac
    done
    shift $((OPTIND - 1))

    "${myDeno}" compile \
        --frozen \
        --allow-all \
        --target "${target}" \
        --output "${output}" \
        "${levainSrcDir}/levain.ts" \
        --is_compiled_binary

    # --is_compiled_binary - Workaround for Levain compile vs uncompiled
    # https://stackoverflow.com/questions/76647896/determine-if-running-uncompiled-ts-script-or-compiled-deno-executable
    # SEE ALSO: scripts/levain-build.cmd
    # SEE ALSO: githubScripts/levain-build.sh
    # SEE ALSO: src/lib/paths/levain_paths.ts
}

# Create levain executable
## Target options:
# x86_64-unknown-linux-gnu
# x86_64-pc-windows-msvc
# x86_64-apple-darwin
# aarch64-apple-darwin
rm -rf "${targetDir}"
mkdir -p "${targetDir}/build"

if [ "$buildMode" = "bundle" ]; then
    echo "Building bundled JS release (no levain.exe) using official Windows deno.exe"
    (
        cd "${levainSrcDir}"
        "${myDeno}" bundle \
            --platform deno \
            --packages bundle \
            --output "${targetDir}/build/levain.bundle.js" \
            "${levainSrcDir}/levain.ts"
    )
    cp -v "${windowsDenoExe}" "${targetDir}/build/deno.exe"
else
    levainCompile -t x86_64-pc-windows-msvc -o "${targetDir}/build/levain.exe"
fi

cp -rv "${levainSrcDir}/levain.cmd" "${targetDir}/"
cp -rv "${levainSrcDir}/levain.ps1" "${targetDir}/"
cp -rv "${levainSrcDir}/levain.sh" "${targetDir}/"
cp -rv "${levainSrcDir}/LICENSE" "${targetDir}/"
cp -rv "${levainSrcDir}/recipes/" "${targetDir}/build/recipes/"
mkdir -p "${targetDir}/build/extra-bin"
if [ -d "${levainSrcDir}/extra-bin" ]; then
    cp -rv "${levainSrcDir}/extra-bin/." "${targetDir}/build/extra-bin/"
fi

# Artifact SHA256
(
    cd "${targetDir}/build"
    if [ "$buildMode" = "bundle" ]; then
        sha256sum deno.exe > deno.exe.sha256
        echo "deno.exe.sha256"
        cat deno.exe.sha256
        sha256sum levain.bundle.js > levain.bundle.js.sha256
        echo "levain.bundle.js.sha256"
        cat levain.bundle.js.sha256
    else
        sha256sum levain.exe > levain.exe.sha256
        echo "levain.exe.sha256"
        cat levain.exe.sha256
    fi
)
