#!/bin/bash

downloadBinary() {
  strip=false;

  while getopts "i:u:sd:" o; do
  case "${o}" in
  i)
      item="${OPTARG}"
      ;;

  u)
      url="${OPTARG}"
      ;;

  s)
      strip=true
      ;;

  d)
      binDir="${OPTARG}"
      ;;

  *)
      echoerr Invalid options
      exit 1
      ;;
  esac
  done
  shift $((OPTIND - 1))

  echo = GET ${item} at ${url}
  tempDir=$( mktemp -d )
  tempFile=$( mktemp --suffix=.tmp.zip )
  curl -ks -o ${tempFile} -L ${url}

  echo = RM ${binDir}
  rm -rf ${binDir}

  echo = UNZIP to ${binDir}
  unzip ${tempFile} -d ${binDir}

  if $strip; then
    echo = STRIP ${binDir}
    for dir in ${binDir}/*; do
      echo strip $dir
      cd $dir
      mv -v * ${binDir}
      cd -
      rmdir $dir
    done
  fi

  rm -rf $tempDir
  rm -rf $tempFile
}

###############################################3

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

levainDir=$1
denoWindowsDir=$2

if [ -z "$levainDir" ]; then
  echo You must inform the levain dir
  exit 1
fi

if [ -z "$denoWindowsDir" ]; then
  echo You must inform the Deno Windows dir
  exit 1
fi

# Deno embedded
echo Deno embedded
rm -rf ${levainDir}/bin
mkdir -p ${levainDir}/bin
cp $denoWindowsDir/deno.exe ${levainDir}/bin

# EXTRA-BIN: curl
curlVersion=7.81.0
curlUrl=https://curl.se/windows/dl-${curlVersion}/curl-${curlVersion}-win64-mingw.zip
curlDir=${levainDir}/extra-bin/windows/curl

downloadBinary -i curl -u $curlUrl -d $curlDir -s
