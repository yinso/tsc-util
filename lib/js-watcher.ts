import * as Promise from 'bluebird';
import * as tsConfig from './tsconfig';
import * as log from './logger';
import * as chokidar from 'chokidar';
import * as tcGlob from './tsconfig-glob';
import * as U from './util';
import * as P from 'esdeps-parser';

export interface JsWatcherOptions {
    config : tsConfig.TsConfig;
    logger : log.ILogService;
}

// what is it that we are looking for?
export class JsWatcher {
    readonly config : tsConfig.TsConfig;
    readonly logger : log.ILogService;
    private _watcherSpec : JsWatcherFileSpec;
    private _watcher !: chokidar.FSWatcher;
    
    constructor(options : JsWatcherOptions) {
        this.config = options.config;
        this.logger = options.logger.pushScope(`JsWatcher`);
        this._watcher = new chokidar.FSWatcher({
            persistent: true,
            depth: 0,
            ignorePermissionErrors: true
        })
        this._watcher
            .on('add', (filePath) => {
                this._onAddFile(filePath);
            })
            .on('change', (filePath) => {
                this._onChangeFile(filePath);
            })
            .on('unlink', (filePath) => {
                this._onUnlinkFile(filePath);
            })
            .on('addDir', (dirPath) => {
                this._onAddDir(dirPath)
            })
            .on('unlinkDir', (filePath) => {
                this._onUnlinkDir(filePath);
            })
            .on('error', (e : Error) => {
                this._onError(e);
            })
        this._watcherSpec = new JsWatcherFileSpec( options)
    }

    run() {
        // how do I know when I am done watch files?
        // that's something difficult to answer.
        return new Promise<void>((resolve, reject) => {
            if (this.config.rootDir !== this.config.outDir) {
                this._watcher.add(this._watcherSpec.includeDirs());
            }
            resolve();
        })
    }

    getWatched() {
        let watched = this._watcher.getWatched();
        return watched;
    }

    private _onAddFile(filePath : string) : void {
        this.logger.debug({
            scope: `_onAddFile`,
            args: [ filePath ],
            isIgnored : this.config.isIgnoredPath(filePath),
            matches : {
                dotJs : this._isDotJs(filePath),
                dotDDotTs : this._isDotDts(filePath)
            },
            shouldWatch: this._shouldWatchFile(filePath)
        });
        if (this._shouldWatchFile(filePath)) {
            // we should copy to destination.
            copyFile(this.config, filePath, this.logger).then(() => null)
        } else {
            this._watcher.unwatch(filePath);
        }
    }

    private _onChangeFile(filePath : string) : void {
        this.logger.debug({
            scope: `_onChangeFile`,
            args: [ filePath ],
            isIgnored : this.config.isIgnoredPath(filePath),
            matches : {
                dotJs : this._isDotJs(filePath),
                dotDDotTs : this._isDotDts(filePath)
            },
            shouldWatch: this._shouldWatchFile(filePath)
        });
        if (this._shouldWatchFile(filePath)) {
            // we should copy to destination.
            copyFile(this.config, filePath, this.logger).then(() => null)
        } else {
            this._watcher.unwatch(filePath);
        }
    }

    private _onUnlinkFile(filePath : string) : void {
        this.logger.debug({
            scope: '_onUnlinkFile',
            args: [ filePath ]
        })
        this._watcher.unwatch(filePath);
        let destPath = this.config.toOutPath(filePath);
        U.rmrf(destPath).then(() => null)
    }

    private _onUnlinkDir(filePath : string) : void {
        this.logger.debug({
            scope: '_onUnlinkDir',
            args: [ filePath ]
        })
        this._watcher.unwatch(filePath);
        let destPath = this.config.toOutPath(filePath);
        U.rmrf(destPath).then(() => null)
    }

    private _onError(e : Error) : void {
        this.logger.error({
            scope: '_onError',
            error: e
        });
    }

    private _onAddDir(dirPath : string) : void {
        this.logger.debug({
            scope: `_onAddDir`,
            args: [ dirPath ],
            isIgnored : this.config.isIgnoredPath(dirPath)
        })
        if (!this.config.isIgnoredPath(dirPath)) {
            this._watcher.add(dirPath)
        }
    }

    private _shouldWatchFile(filePath : string) {
        return (this._isDotDts(filePath) || this._isDotJs(filePath)) && !this.config.isIgnoredPath(filePath);
    }

    private _isDotJs(filePath : string) : boolean {
        return filePath.toLowerCase().endsWith('.js');
    }

    private _isDotDts(filePath : string) : boolean {
        return filePath.toLowerCase().endsWith('.d.ts');
    }
}

export function copyFile(config : tsConfig.TsConfig, filePath : string, logger : log.ILogService) : Promise<void> {
    let outPath = config.toOutPath(filePath);
    // what do I want to do? I want to read in the file and
    // then do some transformation.
    return U.readFile(filePath)
        .then((data) => P.parse({
            filePath, data
        }))
        .then((mod : P.Module) => {
            mod.depends.forEach((dep : P.Depend) => {
                // what do I want to do?
                // if depend == source-map-support - delete this depend.
                // if depend has outDir, replace it.
                // this.logger.debug({
                //     scope: `_copyFile:DEPEND`,
                //     dep,
                //     isFilter: dep.spec.match('source-map-support'),
                //     isRelative: dep.isRelative,
                //     normalizedSpec : dep.isRelative ? this.config.moveModuleSpec(mod.filePath, dep.spec) : dep.spec
                // })
                if (dep.spec.match('source-map-support')) {
                    mod.removeDep(dep);
                } else if (dep.spec.match('ts-node')) {
                    mod.removeDep(dep);
                } else if (dep.isRelative) {
                    mod.moveDep(dep, config.moveModuleSpec(mod.filePath, dep.spec))
                } // else nothing.
            })
            return mod.toString()
        })
        .then((data) => {
            return U.writeFile(outPath, data)
        })
        .catch((e : Error) => {
            logger.error({
                scope: `copyFiles`,
                error: e
            })
        })
}

export interface IncludedFileSpec {
    rootPath : string;
    include: string[];
    exclude : string[];
}

export interface JsWatcherFileSpecOptions {
    config : tsConfig.TsConfig;
}

export class JsWatcherFileSpec {
    readonly config : tsConfig.TsConfig;
    constructor(options : JsWatcherFileSpecOptions) {
        this.config = options.config;
    }

    includeDirs() : string[] {
        return (this.config.include || []).concat(this.config.files || []).map((spec) => {
            return new tcGlob.TsConfigGlob({
                spec,
                basePath: this.config.rootPath,
                allowTypes: ['.js', '.d.ts']
            })
        })
            .filter((glob) => {
                return glob.isDirectorySpec() ||
                    glob.isWildCardSpec() ||
                    (glob.isFileSpec() && (glob.hasExtension('.js') || glob.hasExtension('.d.ts')));
            })
            .map((glob) => {
                return glob.toJsWatcherDirPath(true)
            })

    }

    isIgnoredPath(filePath : string) : boolean {
        let globs = (this.config.excluded || []).map((spec) => {
            return new tcGlob.TsConfigGlob({
                spec,
                basePath: this.config.rootPath
            })
        })
        let glob = globs.find((glob) => {
            return glob.match(filePath)
        })
        return !!glob;
    }

    // includedJsWatcherFileSpec() : IncludedFileSpec {
    //     let exclude = (this.config.excluded || []).map((exc) => {
    //         return new tcGlob.TsConfigGlob({
    //             spec: exc,
    //             basePath: this.config.rootPath
    //         })
    //     })
    //         .map((glob) => glob.toExcludeGlob())
    //     let include = (this.config.include || []).concat(this.config.files || []).map((spec) => {
    //         return new tcGlob.TsConfigGlob({
    //             spec,
    //             basePath: this.config.rootPath,
    //             allowTypes: ['.js', '.d.ts']
    //         })
    //     })
    //         .filter((glob) => {
    //             return glob.isDirectorySpec() ||
    //                 glob.isWildCardSpec() ||
    //                 (glob.isFileSpec() && (glob.hasExtension('.js') || glob.hasExtension('.d.ts')));
    //         })
    //         .map((glob) => {
    //             return glob.toIncludeGlob()
    //         })
    //     return {
    //         rootPath: this.config.rootPath,
    //         include, exclude
    //     }
    // }

    // includeJsWatcherDirPaths(normalize : boolean = true) : IncludedFileSpec {
    //     let exclude = (this.config.excluded || []).map((exc) => {
    //         return new tcGlob.TsConfigGlob({
    //             spec: exc,
    //             basePath: this.config.rootPath
    //         })
    //     })
    //         .map((glob) => glob.toJsWatcherDirPath(normalize))
    //     let include = (this.config.include || []).concat(this.config.files || []).map((spec) => {
    //         return new tcGlob.TsConfigGlob({
    //             spec,
    //             basePath: this.config.rootPath,
    //             allowTypes: ['.js', '.d.ts']
    //         })
    //     })
    //         .filter((glob) => {
    //             return glob.isDirectorySpec() ||
    //                 glob.isWildCardSpec() ||
    //                 (glob.isFileSpec() && (glob.hasExtension('.js') || glob.hasExtension('.d.ts')));
    //         })
    //         .map((glob) => {
    //             return glob.toJsWatcherDirPath(normalize)
    //         })
    //     return {
    //         rootPath: this.config.rootPath,
    //         include, exclude
    //     }
    // }
}
