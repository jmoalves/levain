#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainDir=$1
bootstrapZipFile=$2

workDir=$( mktemp -d )

mkdir -p ${workDir}/extra-bin/windows
for utility in 7-zip curl; do
    cp -r ${levainDir}/extra-bin/windows/${utility} ${workDir}/extra-bin/windows
done
cp ${levainDir}/bootstrap/levainBootstrap.cmd ${workDir}

cd ${workDir}
zip -9r ${bootstrapZipFile} levainBootstrap.cmd extra-bin >/dev/null
cd - >/dev/null
rm -rf ${workDir}

cd $( dirname $bootstrapZipFile )
sha256sum $( basename ${bootstrapZipFile} ) > ${bootstrapZipFile}.sha256
cd - >/dev/null
