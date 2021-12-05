#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

########

myDeno=$1

if [ -z "$myDeno" ]; then
    echo You must inform the deno executable full path
    exit 1
fi

if [ ! -x "$myDeno" ]; then
    echo We can\'t run $myDeno
    exit 1
fi

########

export DENO_DIR=$( mktemp -d )
if ! ${myDeno} cache --unstable --reload levain.ts; then
    echo ERROR compiling levain
    rm -rf ${DENO_DIR}
    exit 1
fi

#FIXME: Run Tests!

rm -rf ${DENO_DIR}

echo
echo CHECK - Levain sources - OK
