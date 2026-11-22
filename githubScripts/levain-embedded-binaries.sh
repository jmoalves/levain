#!/bin/bash
set -euo pipefail

echoErr() { printf "ERR: %s\n" "$*" >&2; }

verifySha256() {
  local file="$1"
  local digest="$2"
  local item="$3"

  if [[ ! "$digest" =~ ^sha256:([0-9a-fA-F]{64})$ ]]; then
    echoErr "Missing or unsupported SHA-256 digest from GitHub API for ${item}: '${digest}'"
    exit 1
  fi

  local expected="${BASH_REMATCH[1]}"
  echo "= VERIFY SHA-256 ${item}: ${expected}"
  printf '%s  %s\n' "$expected" "$file" | sha256sum --check --strict
}

downloadBinary() {
  # https://stackoverflow.com/questions/16654607/using-getopts-inside-a-bash-function
  local OPTIND OPTARG o item="" url="" digest="" strip=false binDir=""
  while getopts "i:u:h:sd:" o; do
    case "${o}" in
      i) item="${OPTARG}" ;;
      u) url="${OPTARG}" ;;
      h) digest="${OPTARG}" ;;
      s) strip=true ;;
      d) binDir="${OPTARG}" ;;
      *)
        echoErr "Invalid options"
        exit 1
        ;;
    esac
  done
  shift $((OPTIND - 1))

  if [ -z "$url" ] || [ -z "$binDir" ]; then
    echoErr "downloadBinary requires -u <url> and -d <binDir> for ${item}"
    exit 1
  fi

  echo "= GET ${item} at ${url}"
  local tempFile
  tempFile=$(mktemp --suffix=.tmp.zip)
  curl -fsSL -o "${tempFile}" "${url}"

  verifySha256 "${tempFile}" "${digest}" "${item}"

  echo "= RM ${binDir}"
  rm -rf "${binDir}"

  echo "= UNZIP to ${binDir}"
  "${zipTool}" x "-o${binDir}" -aoa "${tempFile}" > /dev/null

  if $strip; then
    echo "= STRIP ${binDir}"
    for dir in "${binDir}"/*; do
      mv "$dir"/* "${binDir}"
      rmdir "$dir"
    done
  fi

  rm -f "${tempFile}"
}

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

levainDir=${1:-}
if [ -z "$levainDir" ]; then
  echoErr "You must inform the levain dir"
  exit 1
fi

zipDir=$(mktemp -d)
trap 'rm -rf "$zipDir"' EXIT

# 7-Zip release metadata (reused for Linux extraction tool and Windows extra-bin)
sevenRelease=$(bash "${scriptPath}/github-get-release.sh" -o ip7z -r 7zip)

# 7-Zip - Linux tool
sevenToolAsset=$(printf '%s' "$sevenRelease" | jq -rc '.assets[] | select(.name | test("linux-x64\\.tar\\.xz$")) | "\(.browser_download_url)\t\(.digest // "")"' | head -n 1)
IFS=$'\t' read -r sevenToolUrl sevenToolDigest <<< "$sevenToolAsset"
if [ -z "$sevenToolUrl" ]; then
  echoErr "Could not find 7-Zip Linux x64 asset"
  exit 1
fi

echo "= 7Zip - Tool - ${sevenToolUrl}"
curl -fsSL -o "${zipDir}/7z.tar.xz" "${sevenToolUrl}"
verifySha256 "${zipDir}/7z.tar.xz" "${sevenToolDigest}" "7-Zip Linux tool"
tar xf "${zipDir}/7z.tar.xz" --xz -C "${zipDir}"
zipTool="${zipDir}/7zzs"

# EXTRA-BIN: Inventory
inventoryFile="${levainDir}/extra-bin/windows/inventory.md"
mkdir -p "$(dirname "$inventoryFile")"
rm -f "$inventoryFile"
touch "$inventoryFile"

# EXTRA-BIN: git latest
gitRelease=$(bash "${scriptPath}/github-get-release.sh" -o git-for-windows -r git)
gitAsset=$(printf '%s' "$gitRelease" | jq -rc '.assets[] | select(.name | test("^MinGit-[0-9.]+-64-bit\\.zip$")) | "\(.browser_download_url)\t\(.digest // "")"' | head -n 1)
IFS=$'\t' read -r gitUrl gitDigest <<< "$gitAsset"
gitDir="${levainDir}/extra-bin/windows/git"
echo "| Git | $(printf '%s' "$gitRelease" | jq -r '.tag_name') |" >> "$inventoryFile"

echo
downloadBinary -i "git" -u "$gitUrl" -h "$gitDigest" -d "$gitDir"

# EXTRA-BIN: 7-Zip latest
sevenWinAsset=$(printf '%s' "$sevenRelease" | jq -rc '.assets[] | select(.name | test("-x64\\.exe$")) | "\(.browser_download_url)\t\(.digest // "")"' | head -n 1)
IFS=$'\t' read -r sevenUrl sevenDigest <<< "$sevenWinAsset"
sevenDir="${levainDir}/extra-bin/windows/7-zip"
echo "| 7-Zip | $(printf '%s' "$sevenRelease" | jq -r '.tag_name') |" >> "$inventoryFile"

echo
downloadBinary -i "7-Zip" -u "$sevenUrl" -h "$sevenDigest" -d "$sevenDir"

echo
echo "Inventory: $inventoryFile"
cat "$inventoryFile"
