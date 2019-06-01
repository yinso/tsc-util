#!/usr/bin/env node
const yargs = require('yargs');
// in source mode, below doesn't work.
// we need the bin field in package.json to refer to the dist/ version of
// this script in order for below to work.
// and we should not run this script directly.
require('source-map-support/register');
const main = require('../dist/lib/index');
const log = require('../dist/lib/logger');
// this line needs to be removed in production...
// hmm...
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
const logger = new log.LogService({
    scope: 'tsc-util',
    logLevel: argv.logLevel || log.getDefaultLogLevel(),
    transports: [
        log.transports.make({ type: 'console' }),
    ]
})
process.on('unhandledRejection', function (reason, p) {
    console.log(`******* this is my unhandled rejection error`, reason, p)
})
main.run({ ...argv, logger })
