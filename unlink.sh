#!/usr/bin/env bash

# Note this will no longer be needed once https://github.com/npm/rfcs/blob/latest/accepted/0011-npm-link-changes.md lands

rm_if_link(){ [ ! -L "$1" ] || rm -v "$1"; }

rm_if_link node_modules/@scipe/ui
rm_if_link node_modules/@scipe/blob-store
rm_if_link node_modules/@scipe/workers
rm_if_link node_modules/@scipe/stories
rm_if_link node_modules/@scipe/api
rm_if_link node_modules/@scipe/librarian
rm_if_link node_modules/@scipe/ddoc
rm_if_link node_modules/@scipe/ddoc-auth
rm_if_link node_modules/@scipe/ontologist
rm_if_link node_modules/@scipe/feed
