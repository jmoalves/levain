#!/bin/bash

# FIXME: Check parameters
levainDir=$1
binZipFile=$2

## Create Levain zip
cd ${levainDir}
zip -9r ${binZipFile} extra-bin -x extra-bin/windows/os-utils  >/dev/null
cd - >/dev/null

cd $( dirname ${binZipFile} )
sha256sum $( basename ${binZipFile} ) > ${binZipFile}.sha256
cd - >/dev/null

echo
echo ${binZipFile} created

echo
unzip -l ${binZipFile}

echo
echo ${binZipFile}.sha256
cat ${binZipFile}.sha256
