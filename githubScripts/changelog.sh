#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

debug=false
echoErr() { printf "ERR: %s\n" "$*" >&2; }
echoDebug() { $debug && printf "DEBUG: %s\n" "$*" >&2; }

########
# FIXME: Check parameters
vStart=$1
vEnd=$2
denoDir=$3

if [ "$vStart" == "LATEST" -o "$vStart" == "latest" ]; then
    # Levain latest
    levainRelease=$( bash $scriptPath/github-release.sh -o jmoalves -r levain latest )
    if [ -z "$levainRelease" ]; then
        echoErr ERROR getting levain release latest
        exit 1
    fi
    vStart=$( echo $levainRelease | jq -rc '.tag_name' | sed 's/v//g' )
fi

echo
echo '* Deno version: ' $( ${denoDir}/deno -V | sed 's/deno //ig' )
echo
echo '**WARNING:** Some security software may block `levain.exe`. Ask your Systems Administrator for advice.'
echo
echo '# Changes from' $vStart to $vEnd
git log v${vStart}..v${vEnd} --no-merges --dense --pretty="- %s" \
    | grep -v "^- vHEAD" \
    | grep -v "^- v[0-9]\+" \
    | grep -v "^- (skipChangelog)" \
    | grep -v "^- skip:" \
    | grep -v "^- - skip:"
