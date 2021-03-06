import * as Promise from 'bluebird';
import * as fs from 'fs-extra-promise';
import * as ts from 'typescript';
import * as path from 'path';
import * as minimatch from 'minimatch';
import * as vPath from './vpath';

let _libMap : {[lib : string]: string }= {
    es6: 'es2015',
    es7: 'es2016'
};

function _mapLibName(lib : string) : string {
    if (_libMap.hasOwnProperty(lib)) {
        return _libMap[lib];
    } else {
        return lib;
    }
}

function convertLibs(libs : string[]) : string[] {
    return libs.map((lib) =>`lib.${_mapLibName(lib)}.d.ts`);
}

function convertTarget(target : string) : ts.ScriptTarget {
    switch (target.toLowerCase()) {
        case 'es3':
            return ts.ScriptTarget.ES3;
        case 'es5':
            return ts.ScriptTarget.ES5;
        case 'es6':
        case 'es2015':
            return ts.ScriptTarget.ES2015;
        case 'es7':
        case 'es2016':
            return ts.ScriptTarget.ES2016;
        case 'es2017':
            return ts.ScriptTarget.ES2017;
        case 'es2018':
            return ts.ScriptTarget.ES2018;
        // case 'es2019': // not in 3.0.3 (in 3.4.5)
        //     return ts.ScriptTarget.ES2019;
        case 'esnext':
            return ts.ScriptTarget.ESNext;
        default:
            return ts.ScriptTarget.Latest;
    }
}

function convertJsx(jsx : string) : ts.JsxEmit {
    switch (jsx) {
        case 'preserve':
            return ts.JsxEmit.Preserve;
        case 'react':
            return ts.JsxEmit.React;
        case 'react-native':
            return ts.JsxEmit.ReactNative;
        default:
            return ts.JsxEmit.None;
    }
}

function jsonToTsCompilerOptions(json : any) : ts.CompilerOptions {
    let transformMap : {[key: string] : (v : any) => any }= {
        jsx: convertJsx,
        lib: convertLibs,
        target: convertTarget,
    }
    let result : ts.CompilerOptions = Object.keys(json).reduce((acc, key) => {
        if (transformMap.hasOwnProperty(key)) {
            acc[key] = transformMap[key](json[key]);
        } else {
            acc[key] = json[key];
        }
        return acc;
    }, {} as {[key: string] : any}) as ts.CompilerOptions;
    if (!result.rootDir) {
        result.rootDir = '.';
    }
    if (!result.outDir) {
        result.outDir = '.';
    }
    return result;
}

export interface TsConfigOptions {
    basePath : string;
    configName : string;
    compilerOptions : ts.CompilerOptions;
    files ?: string[];
    include ?: string[];
    exclude ?: string[];
    extends ?: string;
    compileOnSave ?: boolean;
    prevConfig ?: TsConfig;
}

export interface IncludedFileSpec {
    rootPath : string;
    include: string[];
    exclude : string[];
}

// this isn't how it works, I think.
export class TsConfig {
    readonly basePath : string;
    readonly configName : string;
    private readonly _compilerOptions : ts.CompilerOptions;
    private readonly _include ?: string[];
    private readonly _files ?: string[];
    private readonly _exclude ?: string[];
    private readonly _prevConfig ?: TsConfig;

    constructor(options : TsConfigOptions) {
        this.basePath = options.basePath;
        this.configName = options.configName;
        this._compilerOptions = options.compilerOptions;
        this._include = options.include;
        this._exclude = options.exclude;
        this._prevConfig = options.prevConfig;
    }

    get configFilePath() : string {
        return path.join(this.basePath, this.configName)
    }


    get compilerOptions() : ts.CompilerOptions {
        if (this._prevConfig) {
            return Object.assign({}, this._prevConfig.compilerOptions, this._compilerOptions);
        } else {
            return this._compilerOptions;
        }
    }

    get rootDir() {
        return path.join(this.basePath, this.compilerOptions.rootDir || '.');
    }

    get isOutDir() {
        return !!this.compilerOptions.outDir;
    }

    get outDir() {
        return path.join(this.basePath, this.compilerOptions.outDir || '.');
    }

    // this excluded is not useable by our find function.
    // we want our find functions to work correctly with the globs here.
    get excluded() : string[] {
        // outDir is already fullPath.
        let outDirs = this.outDir === this.rootDir ? [] : [ this.compilerOptions.outDir || '.' ];
        return outDirs.concat(this._getBaseExcluded())
            .filter((p : string | undefined) : p is string => typeof(p) === 'string')
            // .map((spec) => this._normalizeGlob(spec))
    }

    // excludedGlob() : string[] {
    //     return this.excluded.map((spec) => this._normalizeGlob(spec))
    // }

    excludedDirs() : string[] {
        let baseExcluded = this._getBaseExcluded();
        let outDirs : string[] = this.outDir === this.rootDir ? [] : [ this.outDir ];
        let excluded = baseExcluded.map((exclude) => {
            if (exclude.endsWith(path.join('/**/*'))) {
                return exclude.substring(0, exclude.length - 5)
            } else {
                return exclude;
            }
        })
            .map((exclude) => path.join(this.basePath, exclude));
        return outDirs.concat(excluded);
    }


    // exclude returns the "exclude" field, without full path resolution.
    private _getBaseExcluded() : string[] {
        if (this._exclude)
            return this._exclude;
        else if (this._prevConfig)
            return this._prevConfig.excluded;
        else
            return [
                'node_modules',
                'bower_components',
                'jspm_packages',
                '.git'
            ]
    }

    // get excludedRegExp() : RegExp[] {
    //     return this.excluded.map((exclude) => minimatch.makeRe(path.join(this.basePath, exclude)))
    // }

    get files() : string[] | undefined {
        if (this._files)
            return this._files;
        else if (this._prevConfig)
            return this._prevConfig.files;
        else
            return undefined;
    }

    get include() : string[] | undefined {
        if (this._include)
            return this._include;
        else if (this._prevConfig)
            return this._prevConfig.include;
        else
            return undefined;
    }

    defaultExclude() {
        return [
            '**/*.d.ts',
        ]
    }

    defaultInclude() {
        let extensions = [
            'ts','tsx'
        ].concat(this.compilerOptions.allowJs ? ['.js','.jsx'] : []);
        return [`**/*.{${extensions.join(',')}}`]
    }

    get rootPath() {
        return path.join(this.basePath, this.compilerOptions.rootDir || '.');
    }

    get outPath() {
        return path.join(this.basePath, this.compilerOptions.outDir || '.');
    }

    toOutPath(filePath : string) : string {
        let relFilePath = path.relative(this.rootPath, filePath);
        return path.join(this.outPath, relFilePath);
    }

    toOutPaths(filePaths : string[]) : string[] {
        return filePaths.map((filePath) => this.toOutPath(filePath))
    }

    toRootPath(filePath : string) : string {
        let relFilePath = path.relative(this.outPath, filePath);
        return path.join(this.rootPath, relFilePath);
    }

    isIgnoredPath(filePath : string) : boolean {
        let excluded = this.excludedDirs();
        for (var i = 0; i < excluded.length; ++i) {
            if (minimatch(filePath, excluded[i]))
                return true
        }
        return false;
    }

    /**
     * Moving a particular module from rootDir to outDir, and then rewrite
     * its path if it has outDir as part of the original path.
     * 
     * i.e.
     * 
     * config.moveModuleSpec('./lib/tsc.js', '../dist/lib/index') ==> '../lib/index'
     * 
     * modulePath = './bin/tsc.js'
     * spec = '../dist/lib/index'
     * 
     * targetModulePath = './dist/bin/tsc.js'
     * normalizedSpec = './dist/lib/index'
     * targetSpec = '../lib/index'
     * 
     * @param modulePath - the relative path from the perspective of tsconfig.
     * @param spec - the spec inside of the module.
     */
    moveModuleSpec(modulePath : string, spec : string) : string {
        let fullModulePath = vPath.isAbsolute(modulePath) ? modulePath : path.join(this.rootPath, modulePath);
        let targetModulePath = this.toOutPath(fullModulePath);
        let normalizedSpec = path.join(path.dirname(fullModulePath), spec); // from rootPath
        if (normalizedSpec.startsWith(this.outDir)) {
            let targetSpec = path.relative(path.dirname(targetModulePath), normalizedSpec)
            return new vPath.PathObject(targetSpec).toVirtualPath();
        } else {
            return spec;
        }
    }
}

export function loadConfig(configName : string = 'tsconfig.json', basePath : string = process.cwd(), recursive : boolean = true) : Promise<TsConfig> {
    return resolveConfigPath(configName, basePath, recursive)
        .then((result) => {
            let configOptions = readConfigurationFile(result);
            if (configOptions.extends) {
                return loadConfig(configOptions.extends, result.basePath, false)
                    .then((prevConfig) => {
                        return new TsConfig({
                            ...configOptions,
                            basePath : result.basePath,
                            configName : result.configName,
                            prevConfig
                        });
                    })
            } else {
                return new TsConfig({
                    ...configOptions,
                    basePath : result.basePath,
                    configName : result.configName,
                });
            }
        })
    }

export function readConfigurationFile(resolvedConfig : ResolveConfigPathResult) : TsConfigOptions {
    let res = ts.readConfigFile(resolvedConfig.configName, (filePath : string) => resolvedConfig.configData)
    let compilerOptions = jsonToTsCompilerOptions(res.config.compilerOptions)
    return {
        ...res.config,
        compilerOptions
    };
}

interface ResolveConfigPathResult {
    basePath : string;
    configName : string;
    configData : string;
}

export function resolveConfigPath(configName : string, basePath : string, recursive : boolean = true) : Promise<ResolveConfigPathResult> {
    let fullPath = path.join(basePath, configName);
    return fs.readFileAsync(fullPath, 'utf8')
        .then((configData) => {
            return {
                basePath: path.dirname(fullPath),
                configName : path.basename(fullPath),
                configData
            } as ResolveConfigPathResult;
        })
        .catch((e) => {
            if (e.code === 'ENOENT') {
                // what do we want to do?
                // determine that the basePath is no longer the rootPath.
                if (isRootPath(basePath) || !recursive) {
                    throw e;
                } else {
                    return resolveConfigPath(configName, path.dirname(basePath))
                }
            } else {
                throw e;
            }
        })
}

function isRootPath(filePath : string) : boolean {
    return path.dirname(filePath) === filePath;
}
