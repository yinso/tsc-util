"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("bluebird");
var fs = require("fs-extra-promise");
var path = require("path");
var ts = require("typescript");
var tsConfig = require("./tsconfig");
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
function compileProgram(config) {
    return config.resolveFilePaths()
        .then(function (tsFiles) {
        var program = ts.createProgram(tsFiles, config.compilerOptions);
        var emitResult = program.emit();
        var allDiagnostics = ts
            .getPreEmitDiagnostics(program)
            .concat(emitResult.diagnostics);
        allDiagnostics.forEach(function (diagnostic) {
            if (diagnostic.file) {
                var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
                var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                console.log(diagnostic.file.fileName + " (" + (line + 1) + "," + (character + 1) + "): " + message);
            }
            else {
                console.log("" + ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
            }
        });
        // let exitCode = emitResult.emitSkipped ? 1 : 0;
        // console.log(`Process exiting with code '${exitCode}'.`);
        //process.exit(exitCode);
    });
}
exports.compileProgram = compileProgram;
function run() {
    return tsConfig.loadConfig()
        .then(function (config) {
        return compileProgram(config)
            .then(function () {
            if (config.rootPath !== config.outDir) {
                return config.resolveJsDtsFilePaths()
                    .then(function (declPaths) {
                    return Promise.map(declPaths, function (fromPath) {
                        var outPath = config.toOutPath(fromPath);
                        return copyFile(fromPath, outPath);
                    })
                        .then(function () { });
                });
            }
        });
    });
}
exports.run = run;
//# sourceMappingURL=tsc.js.map