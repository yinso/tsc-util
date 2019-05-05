"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cp = require("child_process");
var Promise = require("bluebird");
function system(cmd) {
    return new Promise(function (resolve, reject) {
        cp.exec(cmd, function (err, stdout, stderr) {
            if (err) {
                err.stderr = stderr;
                reject(err);
            }
            else {
                resolve({ stdout: stdout, stderr: stderr });
            }
        });
    });
}
exports.system = system;
//# sourceMappingURL=system.js.map