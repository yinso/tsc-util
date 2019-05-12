"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("bluebird");
var fs = require("fs-extra-promise");
var path = require("path");
var ts = require("typescript");
var tsConfig = require("./tsconfig");
var log = require("./logger");
var BaseTscRunner = /** @class */ (function () {
    function BaseTscRunner(options) {
        this.config = options.config;
        this.logger = options.logger;
        this._reportDiagnostic = this._reportDiagnostic.bind(this);
    }
    BaseTscRunner.prototype.copyFile = function (fromPath, toPath) {
        this.logger.debug({
            method: 'copyFile',
            args: [fromPath, toPath]
        });
        return fs.mkdirpAsync(path.dirname(toPath))
            .then(function () { return fs.copyAsync(fromPath, toPath); });
    };
    BaseTscRunner.prototype._reportDiagnostic = function (diagnostic) {
        if (diagnostic.file) {
            var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
            var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            this.logger.error({
                fileName: diagnostic.file.fileName,
                line: line,
                character: character,
                message: message
            });
        }
        else {
            this.logger.error({
                message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
            });
        }
    };
    return BaseTscRunner;
}());
var BatchTscRunner = /** @class */ (function (_super) {
    __extends(BatchTscRunner, _super);
    function BatchTscRunner(options) {
        var _this = _super.call(this, options) || this;
        _this._reportDiagnostics = _this._reportDiagnostics.bind(_this);
        return _this;
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
            .then(this._reportDiagnostics);
    };
    BatchTscRunner.prototype._batchJsAndDTs = function () {
        var _this = this;
        if (this.config.rootPath !== this.config.outDir) {
            return this.config.resolveJsDtsFilePaths()
                .then(function (declPaths) {
                return Promise.map(declPaths, function (fromPath) {
                    var outPath = _this.config.toOutPath(fromPath);
                    return _this.copyFile(fromPath, outPath);
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
    BatchTscRunner.prototype._reportDiagnostics = function (all) {
        var _this = this;
        all.forEach(function (diag) { return _this._reportDiagnostic(diag); });
    };
    return BatchTscRunner;
}(BaseTscRunner));
var WatchTscRunner = /** @class */ (function (_super) {
    __extends(WatchTscRunner, _super);
    function WatchTscRunner(options) {
        var _this = _super.call(this, options) || this;
        _this._formatHost = _this._getFormatHost();
        _this._reportWatchStatusChanged = _this._reportWatchStatusChanged.bind(_this);
        return _this;
    }
    WatchTscRunner.prototype.run = function () {
        var _this = this;
        return this.config.resolveFilePaths()
            .then(function (tsFiles) {
            _this._createProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram;
            _this._watchHost = ts.createWatchCompilerHost(tsFiles, _this.config.compilerOptions, ts.sys, _this._createProgram, _this._reportDiagnostic, _this._reportWatchStatusChanged);
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
}(BaseTscRunner));
function run(options) {
    if (options === void 0) { options = {}; }
    var logger = new log.LogService({
        logLevel: options.logLevel || 'info'
    });
    return tsConfig.loadConfig()
        .then(function (config) {
        var runner = _createRunner({
            watch: options.watch || false,
            config: config,
            logger: logger
        });
        return runner.run();
    })
        .catch(console.error);
}
exports.run = run;
function _createRunner(options) {
    if (options.watch) {
        return new WatchTscRunner(options);
    }
    else {
        return new BatchTscRunner(options);
    }
}
//# sourceMappingURL=tsc.js.map