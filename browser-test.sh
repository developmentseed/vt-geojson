#!/usr/bin/env sh

node_modules/.bin/browserify -t brfs test.js | node_modules/.bin/testling
