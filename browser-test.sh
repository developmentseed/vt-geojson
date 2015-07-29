#!/usr/bin/env sh

node_modules/.bin/browserify -t brfs -t envify test.js | node_modules/.bin/tape-run --browser phantomjs
