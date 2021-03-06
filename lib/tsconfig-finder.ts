import * as Promise from 'bluebird';
import * as tsconfig from './tsconfig';
import { find } from './util';
import * as log from './logger';
import * as tcGlob from './tsconfig-glob';

export interface TsConfigFinderOptions {
    config : tsconfig.TsConfig;
}

export interface IncludedFileSpec {
    rootPath : string;
    include: string[];
    exclude : string[];
}

interface IncludeFileSpecOptions {
    useDefaultExclude ?: boolean;
    allowTypes ?: string[];
}

export class TsConfigFinder {
    readonly config : tsconfig.TsConfig;
    constructor(options : TsConfigFinderOptions) {
        this.config = options.config;
    }

    includedFileSpec({ useDefaultExclude , allowTypes } : IncludeFileSpecOptions = {}) : IncludedFileSpec {
        useDefaultExclude = useDefaultExclude === undefined ? true : useDefaultExclude;
        let excluded = this.config.excluded.concat(useDefaultExclude ? this.config.defaultExclude() : []).map((spec) => {
            return new tcGlob.TsConfigGlob({
                spec,
                basePath: this.config.rootPath
            })
        })
        let include = (this.config.include || this.config.files) ? (this.config.include || []).map((spec) => {
            return new tcGlob.TsConfigGlob({
                spec,
                basePath: this.config.rootPath,
                allowTypes
            })
        }).map((glob) => glob.toIncludeGlob()).concat(this.config.files || []) : this.config.defaultInclude();
        return {
            rootPath: this.config.rootPath,
            include,
            exclude: excluded.map((exc) => exc.toExcludeGlob())
        }
    }

    resolveFilePaths() : Promise<string[]> {
        let included = this.includedFileSpec();
        return find(included.include, {
            cwd: this.config.rootPath, // this needs to include rootDir I think.
            exclude: included.exclude,
            fullPath: true
        })
    }

    resolveJsWatcherFilePaths() : Promise<string[]> {
        let included = this.includedFileSpec({
            useDefaultExclude: false,
            allowTypes: ['.d.ts', '.js']
        });
        return find(included.include, {
            cwd: this.config.rootPath,
            exclude: included.exclude,
            fullPath: true
        })
    }
}
