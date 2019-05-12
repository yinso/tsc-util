import * as Promise from 'bluebird';
import { system } from './system';
import { find } from './find';
import * as fs from 'fs-extra-promise';
import * as path from 'path';
import * as ts from 'typescript';
import * as tsConfig from './tsconfig';

interface TscRunner {
    // this would just do one thing.
    run() : Promise<void>;
}

interface TscRunnerOptions {
    config : tsConfig.TsConfig;
}

class BatchTscRunner implements TscRunner {
    readonly config : tsConfig.TsConfig;
    constructor(options : TscRunnerOptions) {
        this.config = options.config;
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
        .then(reportDiagnostics)

    }

    private _batchJsAndDTs() : Promise<void> {
        if (this.config.rootPath !== this.config.outDir) {
            return this.config.resolveJsDtsFilePaths()
                .then((declPaths) => {
                    return Promise.map(declPaths, (fromPath) => {
                        let outPath = this.config.toOutPath(fromPath);
                        return copyFile(fromPath, outPath)
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
}

class WatchTscRunner<T extends ts.BuilderProgram> implements TscRunner {
    readonly config : tsConfig.TsConfig;
    private readonly _formatHost : ts.FormatDiagnosticsHost;
    private _watchHost !: ts.WatchCompilerHostOfFilesAndCompilerOptions<T>;
    private _createProgram !: ts.CreateProgram<T>;
    private _watchProgram !: ts.WatchOfFilesAndCompilerOptions<T>;
    constructor(options : TscRunnerOptions) {
        this.config = options.config;
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
                    , reportDiagnostic
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

function copyFile(fromPath : string, toPath : string) : Promise<void> {
    console.log(`copy ${fromPath} => ${toPath}`);
    return fs.mkdirpAsync(path.dirname(toPath))
        .then(() => fs.copyAsync(fromPath, toPath))
}

function copyFiles(fromPaths : string[], destDir : string) : Promise<void> {
    return Promise.map(fromPaths, (fromPath) => {
        let toPath = path.join(destDir, fromPath);
        return copyFile(fromPath, toPath)
    })
        .then(() => {})
}

function reportDiagnostic(diagnostic : ts.Diagnostic) {
    if (diagnostic.file) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
            diagnostic.start!
        );
        let message = ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            "\n"
        );
        console.log(
            `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
        );
    } else {
        console.log(
            `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
        );
    }
}

function reportDiagnostics(allDiagnostics : ts.Diagnostic[]) {
    allDiagnostics.forEach(reportDiagnostic);
}

export interface RunOptions {
    watch ?: boolean;
}

export function run(options : RunOptions = {}) {
    if (options.watch) {
        return runWatch();
    } else {
        return runBatch();
    }
}

export function runWatch() {
    return tsConfig.loadConfig()
        .then((config) => {
            let runner = new WatchTscRunner({ config })
            return runner.run();
        })
}

function runBatch() {
    return tsConfig.loadConfig()
        .then((config) => {
            let runner = new BatchTscRunner({ config })
            return runner.run();
        })
}
