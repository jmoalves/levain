#!/bin/bash

## TEMP dirs
actWorkDir=$( mktemp /tmp/levain-act.XXXXXXXXXXXXXXXXX -d )
RUNNER_TEMP=${actWorkDir}/runner
GITHUB_WORKSPACE=${actWorkDir}/ghWorkspace

mkdir -p ${RUNNER_TEMP}
mkdir -p ${GITHUB_WORKSPACE}

## ACT running GitHub actions
act \
    --env RUNNER_TEMP=${RUNNER_TEMP} --var runner.temp=${RUNNER_TEMP} \
    --env GITHUB_WORKSPACE=${GITHUB_WORKSPACE} --var github.workspace=${GITHUB_WORKSPACE} \
    --rm \
    $*
# rm -rf ${actWorkDir}
