#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

levainDir=$1
if [ ! -d "$levainDir"]; then
    echo $levainDir NOT FOUND
    exit 1
fi

rm -rvf ${levainDir}/bootstrap &&
rm -rvf ${levainDir}/scripts &&
rm -rvf ${levainDir}/githubScripts &&
rm -rvf ${levainDir}/ci &&
rm -rvf ${levainDir}/testdata &&
find ${levainDir} -name '*.test.ts' -exec rm -vf {} \;
