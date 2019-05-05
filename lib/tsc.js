"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("bluebird");
var system_1 = require("./system");
var glob = require("glob");
var fs = require("fs-extra-promise");
var path = require("path");
function find(pattern, options) {
    return new Promise(function (resolve, reject) {
        glob(pattern, { ignore: options.exclude }, function (err, matches) {
            if (err) {
                reject(err);
            }
            else {
                resolve(matches);
            }
        });
    });
}
function copyFile(fromPath, toPath) {
    console.log("copy " + fromPath + " => " + toPath);
    return fs.mkdirpAsync(path.dirname(toPath))
        .then(function () { return fs.copyAsync(fromPath, toPath); });
}
function copyFiles(fromPaths, destDir) {
    return Promise.map(fromPaths, function (fromPath) {
        var toPath = path.join(destDir, fromPath);
        return copyFile(fromPath, toPath);
    })
        .then(function () { });
}
function run() {
    return find("**/*.d.ts", { exclude: ['node_modules/**', 'dist/**'] })
        .then(function (declPaths) {
        return copyFiles(declPaths, 'dist');
    })
        .then(function () { return find("**/*.js", { exclude: ['node_modules/**', 'dist/**'] }); })
        .then(function (jsPaths) { return copyFiles(jsPaths, 'dist'); })
        .then(function () { return system_1.system(path.join(process.cwd(), '.\\node_modules\\.bin\\tsc')); });
}
exports.run = run;
//# sourceMappingURL=tsc.js.map