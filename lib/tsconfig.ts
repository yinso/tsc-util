import * as Promise from 'bluebird';
import * as fs from 'fs-extra-promise';
import * as ts from 'typescript';
import * as path from 'path';
import { find } from './find';
import * as minimatch from 'minimatch';

function convertLibs(libs : string[]) : string[] {
    return libs.map((lib) =>`lib.${lib}.d.ts`);
}

function convertTarget(target : string) : ts.ScriptTarget {
    switch (target.toLowerCase()) {
        case 'es3':
            return ts.ScriptTarget.ES3;
        case 'es5':
            return ts.ScriptTarget.ES5;
        case 'es2015':
            return ts.ScriptTarget.ES2015;
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
        this._exclude = options.exclude;
        this._prevConfig = options.prevConfig;
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
        let outDirs = this.outDir === this.rootDir ? [] : [ this.outDir ];
        return outDirs.concat(this._getBaseExcluded())
            .filter((p : string | undefined) : p is string => typeof(p) === 'string')
            .map((spec) => path.join(this.basePath, this._normalizeGlob(spec)))
    }

    excludedDirs() : string[] {
        let excluded = this.excluded;
        return excluded.map((exclude) => {
            if (exclude.endsWith(path.join('/**/*'))) {
                return exclude.substring(0, exclude.length - 5)
            } else {
                return exclude;
            }
        })
    }



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

    get excludedRegExp() : RegExp[] {
        return this.excluded.map((exclude) => minimatch.makeRe(path.join(this.basePath, exclude)))
    }

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

    // this is a combination of include / files / and exclude.

    includedFileSpec(useDefaultExclude : boolean = true) : IncludedFileSpec {
        let exclude = this.excluded.concat(useDefaultExclude ? this._defaultExclude() : []).map(this._normalizeGlob)
        if (!this.include && !this.files) {
            return {
                include: this._defaultInclude(),
                exclude
            }
        } else {
            return {
                include: (this.include || []).concat(this.files || []),
                exclude
            }
        }
    }

    private _defaultExclude() {
        return [
            '**/*.d.ts',
        ]
    }

    private _defaultInclude() {
        let result = [
            '**/*.ts',
            '**/*.tsx'
        ];
        if (this.compilerOptions.allowJs) {
            result.push('**/*.js', '**/*.jsx')
        }
        return result;
    }

    private _normalizeGlob(glob : string) : string {
        if (glob.match(/\*/))
            return glob;
        else
            return `${glob}/**/*`;
    }

    resolveFilePaths() : Promise<string[]> {
        let included = this.includedFileSpec();
        return find(included.include, {
            cwd: this.rootPath, // this needs to include rootDir I think.
            exclude: included.exclude,
            fullPath: true
        })
    }

    resolveJsDtsFilePaths() : Promise<string[]> {
        let included = this.includedFileSpec(false);
        return find([
            '**/*.d.ts',
            '**/*.js'
        ], {
            cwd: this.rootPath,
            exclude: included.exclude,
            fullPath: true
        })
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

    isIgnoredPath(filePath : string) : boolean {
        let excluded = this.excludedDirs();
        for (var i = 0; i < excluded.length; ++i) {
            // console.log(`******** isIgnoredPath-minimatch`, filePath, excluded[i], minimatch(filePath, excluded[i]))
            if (minimatch(filePath, excluded[i]))
                return true
        }
        return false;
    }

    // resolveIncludedFilePaths() : Promise<string[]> {
    //     // we'll make use of the find here...

    // }


    // static loadConfig(configPath : string, basePath ?: string = process.cwd()) : Promise<TsConfig> {
    //     // the idea is that we are going to try to load each of the base
    // }

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
