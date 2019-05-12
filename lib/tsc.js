"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("bluebird");
var fs = require("fs-extra-promise");
var path = require("path");
var ts = require("typescript");
var tsConfig = require("./tsconfig");
var BatchTscRunner = /** @class */ (function () {
    function BatchTscRunner(options) {
        this.config = options.config;
    }
    BatchTscRunner.prototype._batchCompile = function () {
        var _this = this;
        return this.config.resolveFilePaths()
            .then(function (tsFiles) {
            var program = ts.createProgram(tsFiles, _this.config.compilerOptions);
            var emitResult = program.emit();
            return ts
                .getPreEmitDiagnostics(program)
                .concat(emitResult.diagnostics);
        })
            .then(reportDiagnostics);
    };
    BatchTscRunner.prototype._batchJsAndDTs = function () {
        var _this = this;
        if (this.config.rootPath !== this.config.outDir) {
            return this.config.resolveJsDtsFilePaths()
                .then(function (declPaths) {
                return Promise.map(declPaths, function (fromPath) {
                    var outPath = _this.config.toOutPath(fromPath);
                    return copyFile(fromPath, outPath);
                })
                    .then(function () { });
            });
        }
        else {
            return Promise.resolve();
        }
    };
    BatchTscRunner.prototype.run = function () {
        var _this = this;
        return this._batchCompile()
            .then(function () { return _this._batchJsAndDTs(); });
    };
    return BatchTscRunner;
}());
var WatchTscRunner = /** @class */ (function () {
    function WatchTscRunner(options) {
        this.config = options.config;
        this._formatHost = this._getFormatHost();
        this._reportWatchStatusChanged = this._reportWatchStatusChanged.bind(this);
    }
    WatchTscRunner.prototype.run = function () {
        var _this = this;
        return this.config.resolveFilePaths()
            .then(function (tsFiles) {
            _this._createProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram;
            _this._watchHost = ts.createWatchCompilerHost(tsFiles, _this.config.compilerOptions, ts.sys, _this._createProgram, reportDiagnostic, _this._reportWatchStatusChanged);
            _this._watchProgram = ts.createWatchProgram(_this._watchHost);
            return;
        });
    };
    WatchTscRunner.prototype._reportWatchStatusChanged = function (diagnostic) {
        console.info(ts.formatDiagnostic(diagnostic, this._formatHost));
    };
    WatchTscRunner.prototype._getFormatHost = function () {
        return {
            getCanonicalFileName: function (path) { return path; },
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getNewLine: function () { return ts.sys.newLine; }
        };
    };
    return WatchTscRunner;
}());
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
function reportDiagnostic(diagnostic) {
    if (diagnostic.file) {
        var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
        var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        console.log(diagnostic.file.fileName + " (" + (line + 1) + "," + (character + 1) + "): " + message);
    }
    else {
        console.log("" + ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
}
function reportDiagnostics(allDiagnostics) {
    allDiagnostics.forEach(reportDiagnostic);
}
function run(options) {
    if (options === void 0) { options = {}; }
    if (options.watch) {
        return runWatch();
    }
    else {
        return runBatch();
    }
}
exports.run = run;
function runWatch() {
    return tsConfig.loadConfig()
        .then(function (config) {
        var runner = new WatchTscRunner({ config: config });
        return runner.run();
    });
}
exports.runWatch = runWatch;
function runBatch() {
    return tsConfig.loadConfig()
        .then(function (config) {
        var runner = new BatchTscRunner({ config: config });
        return runner.run();
    });
}
//# sourceMappingURL=tsc.js.map