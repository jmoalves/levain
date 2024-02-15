#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
myDeno=$1
levainSrcDir=$2
targetDir=$3

levainCompile() {
    # https://stackoverflow.com/questions/16654607/using-getopts-inside-a-bash-function
    local OPTIND OPTARG o target output
    target=
    output=

    while getopts "t:o:" o; do
    case "${o}" in
    t)
        target="${OPTARG}"
        ;;

    o)
        output="${OPTARG}"
        ;;
    esac
    done
    shift $((OPTIND - 1))

    ${myDeno} compile \
        --reload \
        --allow-read --allow-write --allow-env --allow-net --allow-run \
        --target ${target} \
        --output ${output} \
        ${levainSrcDir}/levain.ts \
        --is_compiled_binary

    # --is_compiled_binary - Workaround for Levain compile vs uncompiled
    # https://stackoverflow.com/questions/76647896/determine-if-running-uncompiled-ts-script-or-compiled-deno-executable
    # SEE ALSO: levain-build.cmd
    # SEE ALSO: levain-build.sh
    # SEE ALSO: levain.ts - get levainRootFile()
}

# Create levain executable
## Target options
# x86_64-unknown-linux-gnu
# x86_64-pc-windows-msvc
# x86_64-apple-darwin
# aarch64-apple-darwin
##
# levainCompile -t x86_64-unknown-linux-gnu -o ${targetDir}/levain
# levainCompile -t x86_64-apple-darwin -o ${targetDir}/levain-mcos
rm -rf ${targetDir}
mkdir -p ${targetDir}
mkdir -p ${targetDir}/build

levainCompile -t x86_64-pc-windows-msvc -o ${targetDir}/build/levain.exe
cp -rv ${levainSrcDir}/levain.cmd ${targetDir}/
cp -rv ${levainSrcDir}/LICENSE ${targetDir}/
cp -rv ${levainSrcDir}/recipes/ ${targetDir}/build/recipes/
cp -rv ${levainSrcDir}/extra-bin/ ${targetDir}/build/extra-bin/
