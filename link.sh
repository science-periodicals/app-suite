#!/usr/bin/env bash

if [[ $1 == "ui" ]]
then
    echo "Linking UI"
    (cd ../ui && npm link)
    npm link @scipe/ui
elif [[ $1 == "resources" ]]
then
    echo "Linking Resources"
    (cd ../resources && npm link)
    npm link @scipe/resources
else
    echo "Linking resources, API, ddoc, stories, librarian, ui and workers"
    # top level links
    (cd ../resources && npm link)
    (cd ../ddoc && npm link)
    (cd ../stories && npm link)
    (cd ../librarian && npm link)
    (cd ../api && npm link)
    (cd ../ui && npm link)
    (cd ../workers && npm link)

    # nested links
    (cd ../ui && npm link @scipe/librarian)
    (cd ../api && npm link @scipe/librarian)
    (cd ../workers && npm link @scipe/librarian)
    (cd ../stories && npm link @scipe/librarian)

    # app-suite links
    npm link @scipe/resources @scipe/librarian @scipe/ui @scipe/api @scipe/workers @scipe/ddoc @scipe/stories
fi
