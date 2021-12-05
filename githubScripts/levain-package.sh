#!/bin/bash

# FIXME: Check parameters
levainDir=$1
levainZipFile=$2

## Create Levain zip
cd $( dirname ${levainDir} )
zip -r ${levainZipFile} $( basename ${levainDir} ) >/dev/null
sha256sum ${levainZipFile} > ${levainZipFile}.sha256
cd - >/dev/null

echo
echo ${levainZipFile} created
unzip -l ${levainZipFile}

echo
echo ${levainZipFile}.sha256
cat ${levainZipFile}.sha256
