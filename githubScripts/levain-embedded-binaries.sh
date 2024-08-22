#!/bin/bash

debug=false
echoErr() { printf "ERR: %s\n" "$*" >&2; }
echoDebug() { $debug && printf "DEBUG: %s\n" "$*" >&2; }

downloadBinary() {
  # https://stackoverflow.com/questions/16654607/using-getopts-inside-a-bash-function
  local OPTIND OPTARG o item url strip binDir
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
  ${zipTool} x -o${binDir} -aoa ${tempFile} > /dev/null

  if $strip; then
    echo = STRIP ${binDir}
    for dir in ${binDir}/*; do
      cd $dir > /dev/null
      mv * ${binDir}
      cd - > /dev/null
      rmdir $dir
    done
  fi

  rm -rf $tempDir
  rm -rf $tempFile
}

###############################################3

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

levainDir=$1

if [ -z "$levainDir" ]; then
  echo You must inform the levain dir
  exit 1
fi


# 7Zip - Linux - latest
sevenToolUrl=$( ${scriptPath}/github-get-release.sh -o ip7z -r 7zip | jq -r '.assets[].browser_download_url' | grep 'linux-x64.tar.xz' )
echo = 7Zip - Tool - ${sevenToolUrl}
zipDir=$( mktemp -d )
rm -rf $zipDir
mkdir -p $zipDir
curl -ks -o ${zipDir}/7z.tar.xz ${sevenToolUrl}
tar xf ${zipDir}/7z.tar.xz --xz -C ${zipDir}
zipTool=${zipDir}/7zzs


# EXTRA-BIN: Inventory
inventoryFile=${levainDir}/extra-bin/windows/inventory.md
mkdir -p $( dirname $inventoryFile )
rm -f $inventoryFile
touch $inventoryFile


# EXTRA-BIN: git latest
gitRelease=$( ${scriptPath}/github-get-release.sh -o git-for-windows -r git )
gitUrl=$( echo ${gitRelease} | jq -r '.assets[].browser_download_url' | grep 'MinGit-[0-9.]\+-64-bit.zip' )
gitDir=${levainDir}/extra-bin/windows/git
echo "* Git: $( echo ${gitRelease} | jq -r '.tag_name' )" >> $inventoryFile

echo
downloadBinary -i git -u $gitUrl -d $gitDir


# EXTRA-BIN: 7-Zip latest
sevenRelease=$( ${scriptPath}/github-get-release.sh -o ip7z -r 7zip )
sevenUrl=$( echo ${sevenRelease} | jq -r '.assets[].browser_download_url' | grep '\-x64.exe' )
sevenDir=${levainDir}/extra-bin/windows/7-zip
echo "* 7-Zip: $( echo ${sevenRelease} | jq -r '.tag_name' )" >> $inventoryFile

echo
downloadBinary -i "7-Zip" -u $sevenUrl -d $sevenDir


## CLEANUP
echo
echo = Cleanup
rm -rf $zipDir
