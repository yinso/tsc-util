import * as Promise from 'bluebird';
import * as ts from 'typescript';
import * as tsConfig from './tsconfig';
import * as log from './logger';
import * as finder from './tsconfig-finder';
import * as U from './util';
import * as js from './js-watcher';
import * as vpath from './vpath';
import * as W from './watcher';

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
    readonly finder : finder.TsConfigFinder;
    readonly logger : log.ILogService;
    constructor(options : TscRunnerOptions) {
        this.config = options.config;
        this.logger = options.logger;
        this.finder = new finder.TsConfigFinder({ config : options.config })
        this._reportDiagnostic = this._reportDiagnostic.bind(this)
    }

    abstract run() : Promise<void>;

    _reportSwitch(diagnostic : ts.Diagnostic, report : {[key: string]: any}) {
        switch (diagnostic.category) {
            case ts.DiagnosticCategory.Error:
                this.logger.error({
                    code : `TS${diagnostic.code}`,
                    ...report
                })
                break;
            case ts.DiagnosticCategory.Warning:
                this.logger.warn({
                    code : `TS${diagnostic.code}`,
                    ...report
                })
                break;
            default:
                this.logger.info({
                    code : `TS${diagnostic.code}`,
                    ...report
                })
                break;
        }
    }

    protected _reportDiagnostic(diagnostic : ts.Diagnostic) {
        let message = ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            "\n"
        );
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
                diagnostic.start!
            );
            this._reportSwitch(diagnostic, {
                fileName: diagnostic.file.fileName,
                line,
                character,
                message
            })
        } else {
            this._reportSwitch(diagnostic, {
                message
            })
        }
    }
}

class BatchTscRunner extends BaseTscRunner {
    readonly jsDtsWatcherMap : js.JsDtsWatcherMap;
    constructor(options : TscRunnerOptions) {
        super({
            ...options,
            logger: options.logger.pushScope('BatchTscRunner')
        });
        this._reportDiagnostics = this._reportDiagnostics.bind(this);
        this.jsDtsWatcherMap = new js.JsDtsWatcherMap(options);
    }

    private _batchCompile() : Promise<void> {
        return this.finder.resolveFilePaths()
        .then((tsFiles) => {
            let program = ts.createProgram(tsFiles, this.config.compilerOptions)
            let emitResult = program.emit();
            return ts
                .getPreEmitDiagnostics(program)
                .concat(emitResult.diagnostics);
        })
        .then(this._reportDiagnostics)
        .catch((e : Error) => {
            this.logger.error({
                scope: `_batchCompile`,
                error: e
            })
        })

    }

    private _batchJsAndDts() : Promise<void> {
        if (this.config.rootPath !== this.config.outDir) {
            return this.jsDtsWatcherMap.runBatch();
        } else {
            return Promise.resolve();
        }

    }

    run() : Promise<void> {
        return this._batchCompile()
            .then(() => this._batchJsAndDts())
    }

    _reportDiagnostics(all : ts.Diagnostic[]) {
        all.forEach((diag) => this._reportDiagnostic(diag));
    }
}

class WatchTscRunner<T extends ts.BuilderProgram> extends BaseTscRunner {
    private readonly _formatHost : ts.FormatDiagnosticsHost;
    private _watchHost !: ts.WatchCompilerHostOfConfigFile<T>;
    private _createProgram !: ts.CreateProgram<T>;
    private _watchProgram !: ts.WatchOfConfigFile<T>;
    private _jsDtsWatcherMap : js.JsDtsWatcherMap;
    private _watcher : W.Watcher;
    constructor(options : TscRunnerOptions) {
        super(options);
        this._formatHost = this._getFormatHost();
        this._reportWatchStatusChanged = this._reportWatchStatusChanged.bind(this);
        this._jsDtsWatcherMap = new js.JsDtsWatcherMap(options);
        this._watcher = new W.Watcher(options);
    }

    run() : Promise<void> {
        return new Promise((resolve, reject) => {
            this._createProgram = (ts.createEmitAndSemanticDiagnosticsBuilderProgram as any) as ts.CreateProgram<T>;
            this._watchHost = ts.createWatchCompilerHost(this.config.configFilePath
                , undefined
                , ts.sys
                , this._createProgram
                , this._reportDiagnostic
                , this._reportWatchStatusChanged)
            
            this._watchProgram = ts.createWatchProgram(this._watchHost);
            this._watcher.watch(this._jsDtsWatcherMap);
        })
    }

    private _reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
        this._reportDiagnostic(diagnostic);
    }

    private _getFormatHost() : ts.FormatDiagnosticsHost {
        return {
            getCanonicalFileName: (path : string) => {
                this.logger.info({
                    getCanonicalFileName: path
                })
                return path
            },
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getNewLine: () => ts.sys.newLine
        };
    }
}

export interface RunOptions {
    logger : log.ILogService;
    watch ?: boolean;
}

export function run(options : RunOptions) {
    return tsConfig.loadConfig()
        .then((config) => {
            let runner = makeRunner({
                watch : options.watch || false,
                config,
                logger: options.logger
            });
            return runner.run();
        })
        .catch((error) => {
            options.logger.error({
                scope: `run`,
                error
            })
        })
}

export interface CreateRunnerOptions {
    watch : boolean;
    logger : log.ILogService;
    config : tsConfig.TsConfig;
}

export function makeRunner(options : CreateRunnerOptions) {
    if (options.watch) {
        return new WatchTscRunner(options);
    } else {
        return new BatchTscRunner(options);
    }
}
