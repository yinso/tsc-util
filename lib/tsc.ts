import * as Promise from 'bluebird';
import { system } from './system';
import { find } from './find';
import * as fs from 'fs-extra-promise';
import * as path from 'path';
import * as ts from 'typescript';
import * as tsConfig from './tsconfig';
import * as log from './logger';

interface TscRunner {
    // this would just do one thing.
    run() : Promise<void>;
}

interface TscRunnerOptions {
    config : tsConfig.TsConfig;
    logger : log.ILogService;
}

abstract class BaseTscRunner implements TscRunner {
    readonly config : tsConfig.TsConfig;
    readonly logger : log.ILogService;
    constructor(options : TscRunnerOptions) {
        this.config = options.config;
        this.logger = options.logger;
        this._reportDiagnostic = this._reportDiagnostic.bind(this)
    }

    abstract run() : Promise<void>;

    copyFile(fromPath : string, toPath : string) : Promise<void> {
        this.logger.debug({
            method: 'copyFile',
            args: [ fromPath, toPath ]
        })
        return fs.mkdirpAsync(path.dirname(toPath))
            .then(() => fs.copyAsync(fromPath, toPath))
    }

    _reportDiagnostic(diagnostic : ts.Diagnostic) {
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
                diagnostic.start!
            );
            let message = ts.flattenDiagnosticMessageText(
                diagnostic.messageText,
                "\n"
            );
            this.logger.error({
                fileName: diagnostic.file.fileName,
                line,
                character,
                message
            })
        } else {
            this.logger.error({
                message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
            })
        }
    }
}

class BatchTscRunner extends BaseTscRunner {
    constructor(options : TscRunnerOptions) {
        super(options);
        this._reportDiagnostics = this._reportDiagnostics.bind(this);
    }

    private _batchCompile() : Promise<void> {
        return this.config.resolveFilePaths()
        .then((tsFiles) => {
            let program = ts.createProgram(tsFiles, this.config.compilerOptions)
            let emitResult = program.emit();
            return ts
                .getPreEmitDiagnostics(program)
                .concat(emitResult.diagnostics);
        })
        .then(this._reportDiagnostics)

    }

    private _batchJsAndDTs() : Promise<void> {
        if (this.config.rootPath !== this.config.outDir) {
            return this.config.resolveJsDtsFilePaths()
                .then((declPaths) => {
                    return Promise.map(declPaths, (fromPath) => {
                        let outPath = this.config.toOutPath(fromPath);
                        return this.copyFile(fromPath, outPath)
                    })
                        .then(() => {})
                })
        } else {
            return Promise.resolve();
        }

    }

    run() : Promise<void> {
        return this._batchCompile()
            .then(() => this._batchJsAndDTs())
    }

    _reportDiagnostics(all : ts.Diagnostic[]) {
        all.forEach((diag) => this._reportDiagnostic(diag));
    }
}

class WatchTscRunner<T extends ts.BuilderProgram> extends BaseTscRunner {
    private readonly _formatHost : ts.FormatDiagnosticsHost;
    private _watchHost !: ts.WatchCompilerHostOfFilesAndCompilerOptions<T>;
    private _createProgram !: ts.CreateProgram<T>;
    private _watchProgram !: ts.WatchOfFilesAndCompilerOptions<T>;
    constructor(options : TscRunnerOptions) {
        super(options);
        this._formatHost = this._getFormatHost();
        this._reportWatchStatusChanged = this._reportWatchStatusChanged.bind(this);
}

    run() : Promise<void> {
        return this.config.resolveFilePaths()
            .then((tsFiles) => {
                this._createProgram = (ts.createEmitAndSemanticDiagnosticsBuilderProgram as any) as ts.CreateProgram<T>;
                this._watchHost = ts.createWatchCompilerHost(tsFiles
                    , this.config.compilerOptions
                    , ts.sys
                    , this._createProgram
                    , this._reportDiagnostic
                    , this._reportWatchStatusChanged)
                this._watchProgram = ts.createWatchProgram(this._watchHost);
                return;
            })
    }

    private _reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
        console.info(ts.formatDiagnostic(diagnostic, this._formatHost));
    }

    private _getFormatHost() : ts.FormatDiagnosticsHost {
        return {
            getCanonicalFileName: (path : string) => path,
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getNewLine: () => ts.sys.newLine
        };
    }
}

export interface RunOptions {
    watch ?: boolean;
    logLevel ?: log.LogLevel;
}

export function run(options : RunOptions = {}) {
    let logger = new log.LogService({
        logLevel: options.logLevel || 'info'
    })
    return tsConfig.loadConfig()
        .then((config) => {
            let runner = _createRunner({
                watch : options.watch || false,
                config,
                logger
            });
            return runner.run();
        })
        .catch(console.error)
}

export interface CreateRunnerOptions {
    watch : boolean;
    logger : log.ILogService;
    config : tsConfig.TsConfig;
}

function _createRunner(options : CreateRunnerOptions) {
    if (options.watch) {
        return new WatchTscRunner(options);
    } else {
        return new BatchTscRunner(options);
    }
}
