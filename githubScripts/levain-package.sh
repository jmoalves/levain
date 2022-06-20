#!/bin/bash

# FIXME: Check parameters
levainDir=$1
levainZipFile=$2
strip=$3

## Create Levain zip
if [ -z "$strip" ]; then
    cd $( dirname ${levainDir} )
    zip -9r ${levainZipFile} $( basename ${levainDir} ) >/dev/null
    cd - >/dev/null
else
    cd ${levainDir}
    zip -9r ${levainZipFile} * >/dev/null
    cd - >/dev/null
fi

cd $( dirname ${levainZipFile} )
sha256sum $( basename ${levainZipFile} ) > ${levainZipFile}.sha256
cd - >/dev/null

echo
echo ${levainZipFile} created

echo
unzip -l ${levainZipFile}

echo
echo ${levainZipFile}.sha256
cat ${levainZipFile}.sha256
