import * as Promise from 'bluebird';
import { TsConfig } from "./tsconfig";
import { ILogService } from "./logger";
import { TsConfigFinder } from "./tsconfig-finder";
import * as ts from 'typescript';

export interface BatchRunner {
    runBatch() : Promise<void>;
}

export interface TsRunnerOptions {
    config : TsConfig;
    logger : ILogService;
}

// AggregatedRunner

export class TsRunner implements BatchRunner {
    readonly config : TsConfig;
    readonly logger : ILogService;
    readonly finder : TsConfigFinder;
    constructor(options : TsRunnerOptions) {
        this.config = options.config;
        this.logger = options.logger;
        this.finder = new TsConfigFinder(options)
        this._reportDiagnostics = this._reportDiagnostics.bind(this)
    }

    runBatch() : Promise<void> {
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

    protected _reportDiagnostics(all : ts.Diagnostic[]) {
        all.forEach((diag) => this._reportDiagnostic(diag));
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