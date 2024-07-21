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

# 7Zip - Linux
# https://www.7-zip.org/download.html
echo = 7Zip - Tool
zipDir=$( mktemp -d )
rm -rf $zipDir
mkdir -p $zipDir
curl -ks -o ${zipDir}/7z.tar.xz https://www.7-zip.org/a/7z2407-linux-x64.tar.xz
tar xf ${zipDir}/7z.tar.xz --xz -C ${zipDir}
zipTool=${zipDir}/7zzs


# EXTRA-BIN: git
# https://github.com/git-for-windows/git/releases/latest
gitUrl=https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/MinGit-2.45.2-64-bit.zip
gitDir=${levainDir}/extra-bin/windows/git

echo
downloadBinary -i git -u $gitUrl -d $gitDir


# EXTRA-BIN: 7-Zip
# https://www.7-zip.org/download.html
sevenUrl=https://www.7-zip.org/a/7z2407-x64.exe
sevenDir=${levainDir}/extra-bin/windows/7-zip

echo
downloadBinary -i "7-Zip" -u $sevenUrl -d $sevenDir

## CLEANUP
echo
echo = Cleanup
rm -rf $zipDir
