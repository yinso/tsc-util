import * as Promise from 'bluebird';
import { system } from './system';
import { find } from './find';
import * as fs from 'fs-extra-promise';
import * as path from 'path';
import * as ts from 'typescript';
import * as tsConfig from './tsconfig';

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

export function compileProgram(config : tsConfig.TsConfig) {
    return config.resolveFilePaths()
        .then((tsFiles) => {
            let program = ts.createProgram(tsFiles, config.compilerOptions)
            let emitResult = program.emit();
            let allDiagnostics = ts
                .getPreEmitDiagnostics(program)
                .concat(emitResult.diagnostics);

            allDiagnostics.forEach(diagnostic => {
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
            });

            // let exitCode = emitResult.emitSkipped ? 1 : 0;
            // console.log(`Process exiting with code '${exitCode}'.`);
            //process.exit(exitCode);
        });
}

export function run() {
    return tsConfig.loadConfig()
        .then((config) => {
            return compileProgram(config)
                .then(()  => {
                    if (config.rootPath !== config.outDir) {
                        return config.resolveJsDtsFilePaths()
                            .then((declPaths) => {
                                return Promise.map(declPaths, (fromPath) => {
                                    let outPath = config.toOutPath(fromPath);
                                    return copyFile(fromPath, outPath)
                                })
                                    .then(() => {})
                            })
                    }
                })
        })
}
