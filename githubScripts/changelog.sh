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

echo
echo '**WARNING:** Some security software may block `levain.exe`. Ask your Systems Administrator for advice.'
echo '**TIP:** To test this release without `levain.exe` (using official upstream `deno.exe` + `levain.bundle.js`), set `$levainBundle="true"` before running `install.ps1` or download `levain-bundle-windows-x86_64.zip`.'

echo
echo '# Support binaries'
echo "| Software | version |"
echo "| :----- | :------- |"
echo "| Deno | $( "${denoDir}/deno" -V | sed 's/deno //ig' ) |"
if [ -e "${levainDir}/extra-bin/windows/inventory.md" ]; then
    cat "${levainDir}/extra-bin/windows/inventory.md"
fi
echo

echo
echo "# Changes from ${vStart} to ${vEnd}"
commits=$(git log "v${vStart}..v${vEnd}" --no-merges --dense --pretty="- %s")
if [ -n "$commits" ]; then
    printf '%s\n' "$commits" \
        | grep -Ev "^- (vHEAD|v[0-9]+|\(skipChangelog\)|skip:|- skip:|chore\(release\):)" || true
fi
