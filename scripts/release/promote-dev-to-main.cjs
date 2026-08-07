#!/usr/bin/env node
'use strict';

const { runCli } = require('./release-workflow.cjs');

process.exitCode = runCli('promote-dev-to-main', process.argv.slice(2));
