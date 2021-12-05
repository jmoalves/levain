#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainDir=$1

echo CLEAN $levainDir
for dir in \
        ${levainDir}/bootstrap \
        ${levainDir}/scripts \
        ${levainDir}/githubScripts \
        ${levainDir}/ci \
        #${levainDir}/src \
        #${levainDir}/levain.ts \
        ${levainDir}/testdata \
        #${levainDir}/bin/deps \
        #${levainDir}/bin/gen \
        ; do
    if ! rm -rvf ${dir}; then
        echo ERROR removing $dir
        exit 1
    fi
done

if ! find ${levainDir} -name '*.test.ts' -exec rm -vf {} \; ; then
    echo ERROR Cleaning levain
    exit 1
fi

echo CLEAN $levainDir - DONE
