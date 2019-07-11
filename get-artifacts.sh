#!/usr/bin/env bash

BUILD_NUM=${1:-latest}

URL=$(curl https://circleci.com/api/v1.1/project/github/science-periodicals/app-suite/${BUILD_NUM}/artifacts?circle-token=$CIRCLE_TOKEN | grep -o 'https://[^"]*')
echo $URL

wget ${URL}?circle-token=$CIRCLE_TOKEN -O backstop_data/backstop-artifacts.zip
(cd backstop_data && unzip backstop-artifacts.zip)
rm backstop_data/backstop-artifacts.zip
