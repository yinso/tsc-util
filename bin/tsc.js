#!/usr/bin/env node
const yargs = require('yargs');
const main = require('../lib/tsc');
const argv = yargs.argv;

main.run(argv)
    .then(console.log)
    .catch(console.error);
