#!/usr/bin/env bash

echo "Checking if @scipe/app-suite dependencies are up to date"

error=false

for module in @scipe/librarian @scipe/api @scipe/ui @scipe/workers
do
    echo "- $module"
    latest=`npm show $module version`
    current=`npm ls $module --json 2> /dev/null | ./node_modules/.bin/json dependencies.$module.version`
    if [[ $latest != $current ]]; then
        error=true
        echo "  ERR: $module is not up to date ($latest vs $current)";
    else
        echo "  OK ($module@$latest)"
    fi
done

echo "Checking if CLIs are up to date"

echo "- librarian CLI"
if ! [ -x "$(command -v librarian)" ]; then
  echo "ERR: librarian CLI is not installed. Run npm install @scipe/librarian -g to install."
  error=true
else
    latest=`npm show @scipe/librarian version`
    current=`librarian -v`
    if [[ $latest != $current ]]; then
        error=true
        echo "  ERR: librarian CLI is not up to date ($latest vs $current)";
    else
        echo "  OK (librarian CLI $current)"
    fi
fi

echo "- run-workers CLI"
if ! [ -x "$(command -v run-workers)" ]; then
  echo "ERR: run-workers CLI is not installed. Run npm install @scipe/workers -g to install."
  error=true
else
    latest=`npm show @scipe/workers version`
    current=`run-workers -v`
    if [[ $latest != $current ]]; then
        error=true
        echo "  ERR: run-workers CLI is not up to date ($latest vs $current)";
    else
        echo "  OK (run-workers CLI $current)"
    fi
fi

echo "- create-story CLI"
if ! [ -x "$(command -v create-story)" ]; then
  echo "ERR: create-story CLI is not installed. Run npm install @scipe/stories -g to install."
  error=true
else
    latest=`npm show @scipe/stories version`
    current=`create-story -v`
    if [[ $latest != $current ]]; then
        error=true
        echo "  ERR: create-story CLI is not up to date ($latest vs $current)";
    else
        echo "  OK (create-story CLI $current)"
    fi
fi


if [[ $error == true ]]; then exit 1; else exit 0; fi
