#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
myDeno=$1
levainSrcDir=$2
levainBinDir=$3

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
        --unstable \
        --allow-read --allow-write --allow-env --allow-net --allow-run \
        --target ${target} --output ${output} \
        ${levainSrcDir}/levain.ts
}

# Create levain executable
## Target options
# x86_64-unknown-linux-gnu
# x86_64-pc-windows-msvc,
# x86_64-apple-darwin
# aarch64-apple-darwin
##
# levainCompile -t x86_64-unknown-linux-gnu -o ${levainBinDir}/levain
# levainCompile -t x86_64-apple-darwin -o levain-mcos
levainCompile -t x86_64-pc-windows-msvc -o ${levainBinDir}/levain.exe
