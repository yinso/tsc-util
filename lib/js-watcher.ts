import * as Promise from 'bluebird';
import * as tsConfig from './tsconfig';
import * as log from './logger';
import * as chokidar from 'chokidar';
import * as tcGlob from './tsconfig-glob';
import * as U from './util';
import * as P from 'esdeps-parser';
import * as W from './watcher';
import * as F from './tsconfig-finder';


export interface JsWatcherOptions {
    config : tsConfig.TsConfig;
    logger : log.ILogService;
}

export class JsDtsWatcherMap implements W.WatcherMap {
    readonly spec : string[];
    readonly logger : log.ILogService;
    readonly config : tsConfig.TsConfig;
    private readonly _finder : F.TsConfigFinder;
    private readonly _watcherSpec : JsWatcherFileSpec;
    constructor(options : JsWatcherOptions) {
        this.logger = options.logger;
        this.config = options.config;
        this._watcherSpec = new JsWatcherFileSpec(options);
        this._finder = new F.TsConfigFinder({ config: this.config });
        this.spec = this._watcherSpec.includeDirs();
        this.onAdd = this.onAdd.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onUnlink = this.onUnlink.bind(this);
    }

    onAdd(filePath : string) : Promise<void> {
        return copyFile(this.config, filePath, this.logger)
    }

    onChange(filePath : string) : Promise<void> {
        return copyFile(this.config, filePath, this.logger)
    }

    onUnlink(filePath : string) {
        let destPath = this.config.toOutPath(filePath);
        return U.rmrf(destPath)
    }

    bind(watcher : W.Watcher) {
        watcher.watch(this);
    }

    runBatch() : Promise<void> {
        return this._finder.resolveJsWatcherFilePaths()
            .then((filePaths) => {
                return Promise.map(filePaths, (filePath) => {
                    return copyFile(this.config, filePath, this.logger)
                })
            })
                .then(() => {})
    }
}

export class JsWatcher2 extends W.Watcher {
    readonly config : tsConfig.TsConfig;
    private readonly _watcherSpec : JsWatcherFileSpec;
    constructor(options : JsWatcherOptions) {
        super({
            logger: options.logger
        })
        this.config = options.config;
        this._copyFile = this._copyFile.bind(this);
        this._unlinkFile = this._unlinkFile.bind(this);
        this._watcherSpec = new JsWatcherFileSpec( options)
    }

    private _copyFile(filePath : string) {
        return copyFile(this.config, filePath, this.logger)
    }

    private _unlinkFile(filePath : string) {
        let destPath = this.config.toOutPath(filePath);
        return U.rmrf(destPath)
    }

    run() {
        return new Promise<void>((resolve, reject) => {
            if (this.config.rootDir !== this.config.outDir) {
                let includeDirs = this._watcherSpec.includeDirs();
                this.logger.info({
                    scope: 'run ',
                    includeDirs
                })
                this.watch({
                    spec: includeDirs,
                    onAdd: this._copyFile,
                    onChange: this._copyFile,
                    onUnlink: this._unlinkFile,
                })
            }
            resolve();
        })
    }
}

function copyFile(config : tsConfig.TsConfig, filePath : string, logger : log.ILogService) : Promise<void> {
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

export interface JsWatcherFileSpecOptions {
    config : tsConfig.TsConfig;
}

export class JsWatcherFileSpec {
    readonly config : tsConfig.TsConfig;
    constructor(options : JsWatcherFileSpecOptions) {
        this.config = options.config;
    }

    includeDirs() : string[] {
        let dirsList = (this.config.include || []).concat(this.config.files || []).map((spec) => {
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
                return glob.toJsWatcherDirPaths(true)
            })
        return ([] as string[]).concat(...dirsList);
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
}
