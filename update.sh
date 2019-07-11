#!/usr/bin/env bash

git fetch && git merge origin/master && npm install
(cd ../librarian && git fetch && git merge origin/master && npm install)
(cd ../api && git fetch && git merge origin/master && npm install)
(cd ../ui && git fetch && git merge origin/master && npm install)
