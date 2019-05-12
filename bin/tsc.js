#!/usr/bin/env node
const yargs = require('yargs');
const main = require('../lib/tsc');
const argv = yargs
    .options({
        watch: {
            alias: 'w',
            describe: 'Incrementally compile the TypeScript files.',
            type: 'boolean',
            default: false
        }
    })
    .help()
    .argv;

main.run(argv)
    .then(console.log)
    .catch(console.error);
