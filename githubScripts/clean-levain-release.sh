#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainDir=$1

echo Cleaning $levainDir

rm -rf ${levainDir}/bootstrap
rm -rf ${levainDir}/scripts
rm -rf ${levainDir}/githubScripts
rm -rf ${levainDir}/ci
#rm -rf ${levainDir}/src
#rm -rf ${levainDir}/levain.ts
rm -rf ${levainDir}/testdata
#rm -rf ${levainDir}/bin/deps
#rm -rf ${levainDir}/bin/gen
find ${levainDir} -name '*.test.ts' -exec rm {} \;
