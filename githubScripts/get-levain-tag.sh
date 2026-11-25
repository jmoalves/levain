#!/bin/bash
set -euo pipefail

levainVersion=${1:-}
levainDir=${2:-}

if [ -z "$levainVersion" ] || [ -z "$levainDir" ]; then
    echo "Usage: $0 <levain-version> <target-dir>" >&2
    exit 1
fi

rm -rf "${levainDir}"
mkdir -p "${levainDir}"
git archive "v${levainVersion}" | tar x -C "${levainDir}"

echo "Levain ${levainVersion} at ${levainDir}"
