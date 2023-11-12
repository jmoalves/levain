#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainSrcDir=$1
levainBinDir=$2
bootstrapZipFile=$3

workDir=$( mktemp -d )

mkdir -p ${workDir}/extra-bin/windows
for utility in 7-zip curl; do
    cp -r ${levainBinDir}/extra-bin/windows/${utility} ${workDir}/extra-bin/windows
done
cp ${levainSrcDir}/bootstrap/levainBootstrap.cmd ${workDir}

cd ${workDir}
zip -9r ${bootstrapZipFile} levainBootstrap.cmd extra-bin >/dev/null
cd - >/dev/null
rm -rf ${workDir}

cd $( dirname $bootstrapZipFile )
sha256sum $( basename ${bootstrapZipFile} ) > ${bootstrapZipFile}.sha256
cd - >/dev/null
