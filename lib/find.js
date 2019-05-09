"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("bluebird");
var glob = require("glob");
function find(pattern, options) {
    var patterns = typeof (pattern) === 'string' ? [pattern] : pattern;
    return Promise.map(patterns, function (pattern) { return _findOne(pattern, options); })
        .then(function (results) { return _unique(results); });
}
exports.find = find;
function _unique(ars) {
    var map = new Map();
    return ars.reduce(function (acc, ary) {
        ary.forEach(function (item) {
            if (!map.has(item)) {
                map.set(item, true);
                acc.push(item);
            }
        });
        return acc;
    }, []);
}
function _findOne(pattern, options) {
    var globOptions = {
        cwd: options.cwd || process.cwd(),
        ignore: options.exclude || [],
        realpath: typeof (options.fullPath) === 'boolean' ? options.fullPath : false
    };
    return new Promise(function (resolve, reject) {
        glob(pattern, globOptions, function (err, matches) {
            if (err) {
                reject(err);
            }
            else {
                resolve(matches);
            }
        });
    });
}
//# sourceMappingURL=find.js.map