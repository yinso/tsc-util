#!/usr/bin/env node
const yargs = require('yargs');
// in source mode, below doesn't work.
// we need the bin field in package.json to refer to the dist/ version of
// this script in order for below to work.
// and we should not run this script directly.
const main = require('../dist/lib/index');
// this line needs to be removed in production...
// hmm...
require('source-map-support/register');
const argv = yargs
    .options({
        watch: {
            alias: 'w',
            describe: 'Incrementally compile the TypeScript files.',
            type: 'boolean',
            default: false
        },
        logLevel: {
            alias: 'l',
            describe: 'Specify the log level',
            choices: [ 'error', 'warn', 'info', 'debug', 'trace' ],
            default: 'info'
        }
    })
    .help()
    .argv;

main.run(argv)
