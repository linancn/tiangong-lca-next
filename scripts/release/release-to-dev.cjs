#!/usr/bin/env node
'use strict';

const { runCli } = require('./release-workflow.cjs');

process.exitCode = runCli('release-to-dev', process.argv.slice(2));
