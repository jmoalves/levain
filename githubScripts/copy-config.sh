#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

levainSrcDir=$1
levainDstDir=$2
if [ ! -d "$levainSrcDir" ]; then
    echo $levainSrcDir NOT FOUND
    exit 1
fi

if [ ! -d "$levainDstDir" ]; then
    echo $levainDstDir NOT FOUND
    exit 1
fi

for file in \
    recipes \
    src/locales \
    levain.cmd \
    LICENSE \
    extra-bin ; do
    cp -rv ${levainSrcDir}/$file ${levainDstDir}
done