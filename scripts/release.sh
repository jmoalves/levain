#!/bin/bash

version=$1
githubToken=$2

if [ -z "$version" ]; then
    echo You must inform the version number. Aborting...
    exit 1
fi

if [ -z "$githubToken" ]; then
    echo You must inform the GitHub token. Aborting...
    exit 1
fi

## TODO: Check if version matches regexp [0-9]+\.[0-9]+\.[0-9]+

# Check JQ
if ! $( jq-win64 --help > /dev/null ) ; then
    echo jq-win64 NOT FOUND
    exit 1
fi

myPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $myPath/..

git fetch --all

# Check changes
changes=$( git status --porcelain )
if [ -n "$changes" ]; then
    echo Git repo with changes. Aborting...
    echo $changes
    exit 1
fi

# Check tag
tag=v${version}
tagExists=$( git tag -l $tag )
if [ -n "$tagExists" ]; then  
    echo Git tag $tag already exists. Aborting...
    exit 1
fi

# Check release
releases=$( curl -ks -X GET -u username:$githubToken \
    https://api.github.com/repos/jmoalves/levain/releases \
    | jq-win64 -r .[].tag_name \
    | sed 's/ //g')
for r in $releases; do
    if [ $tag = $r ]; then
        echo Git release $r exists. Aborting...
        exit 1
    fi
done

# Change version at main file
cp -f src/levain.ts src/levain.ts.bkp
cat src/levain.ts.bkp \
    | sed "s/levain vHEAD/levain ${tag}/g" \
    > src/levain.ts

# Change version at yaml file
cp -f levain.levain.yaml levain.levain.yaml.bkp
cat levain.levain.yaml.bkp \
    | sed "s/version: .*/version: ${version}/g" \
    > levain.levain.yaml
rm levain.levain.yaml.bkp

# Commit version
git add src/levain.ts
git commit -m "$tag"
git tag $tag
git push

# Release at Github
# TODO: Allow inform: Description, prerelease
curl -ks -X POST -u username:$githubToken \
    -d "{ \
        \"tag_name\": \"$tag\", \
        \"name\": \"$tag\", \
        \"prerelease\": true \
    }" \
    https://api.github.com/repos/jmoalves/levain/releases

# Restore file
cp -f src/levain.ts.bkp src/levain.ts
git add src/levain.ts
git commit -m "vHEAD"
rm  src/levain.ts.bkp
git push

# Done
echo Release $tag created
echo
