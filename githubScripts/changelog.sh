#!/bin/bash
set -euo pipefail

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echoErr() { printf "ERR: %s\n" "$*" >&2; }

vStart=${1:-}
vEnd=${2:-}
denoDir=${3:-}
levainDir=${4:-}

if [ -z "$vStart" ] || [ -z "$vEnd" ] || [ -z "$denoDir" ] || [ -z "$levainDir" ]; then
    echoErr "Usage: $0 <start-version|latest> <end-version> <deno-dir> <levain-dir>"
    exit 1
fi

repoSlug="${GITHUB_REPOSITORY:-jmoalves/levain}"
repoOwner="${repoSlug%%/*}"
repoName="${repoSlug#*/}"

if [ "$vStart" = "LATEST" ] || [ "$vStart" = "latest" ]; then
    levainRelease=$(bash "${scriptPath}/github-get-release.sh" -o "$repoOwner" -r "$repoName" latest)
    if [ -z "$levainRelease" ]; then
        echoErr "ERROR getting levain release latest"
        exit 1
    fi
    vStart=$(printf '%s' "$levainRelease" | jq -rc '.tag_name // empty' | sed 's/^v//')
    if [ -z "$vStart" ]; then
        echoErr "ERROR resolving tag_name from latest release response"
        exit 1
    fi
fi

vStart="${vStart#v}"
vEnd="${vEnd#v}"

denoVer=$("${denoDir}/deno" -V | sed 's/deno //ig')

commitsFile=$(mktemp)
trap 'rm -f "$commitsFile"' EXIT

git log "v${vStart}..v${vEnd}" --first-parent --pretty="format:%s%x1f%b%x1e" > "$commitsFile"

"${denoDir}/deno" run --no-config --allow-read \
    "${scriptPath}/../scripts/generate_changelog.ts" \
    --repo "${repoSlug}" \
    --from "${vStart}" \
    --to "${vEnd}" \
    --deno-version "${denoVer}" \
    --inventory "${levainDir}/extra-bin/windows/inventory.md" \
    --commits-file "${commitsFile}"
