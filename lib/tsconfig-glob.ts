import * as path from 'path';
import * as pathUtil from './path-util';
/**
 * TypeScript uses its own glob that differs from `glob`'s spec
 * and the `glob` used in `chokidar`, so we need something to 
 * hold the logic that transforms between these 3 systems.
 * 
 * Given that in our environment TypeScript will be the source,
 * we will start here.
 * 
 * https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
 * 
 * `*` matches zero or more characters (excluding directory separators)
 * `?` matches any one character (excluding directory separators)
 * `**\/` (remove the backslash) recursively matches any sub directory
 * 
 * if a segment of a glob pattern includes only `*` or `.*`, only files
 * with supported extensions are included (`*.ts`, `*.d.ts`, `*.tsx`.
 * if `allowJs` is set to true, then `*.js` and `*.jsx`).
 */

export interface TsConfigGlobOptions {
    spec : string;
    basePath ?: string;
    allowJs ?: boolean;
}

export class TsConfigGlob {
    readonly spec : string;
    readonly basePath : string;
    readonly allowJs : boolean;
    private _segs : string[];
    private _allowTypes : string[];
    constructor(options : TsConfigGlobOptions) {
        this.spec = options.spec;
        this.basePath = options.basePath || process.cwd();
        this.allowJs = options.allowJs || false;
        this._segs = this.spec.split('/')
        if (this._segs.length === 0) {
            throw new Error(`InvalidTsIncludePattern: ${this.spec}`)
        }
        this._allowTypes = this._defaultSetAllowTypes();
    }

    toChokidar() : string {
        return this.spec;   
    }

    toIncludeGlob(useFullPath ?: boolean) : string {
        // if ends in directory name.
        return this._useFullPath(this._toIncludeGlob(), useFullPath || false);
    }

    private _toIncludeGlob() : string {
        // we want to exclude the directory itself!!!
        if (this.isDirectorySpec()) {
            return `${this.spec}/**/*.${this.globAllowTypeString()}`;
        } else if (this.isWildCardSpec()) {
            // what to do otherwise?
            // we can make assumption that 
            return this.spec + '.' + this.globAllowTypeString();
        } else { // this should have been basically a 
            return this.spec;
        }
    }

    private _useFullPath(spec : string, useFullPath : boolean) {
        return useFullPath ? pathUtil.join(this.basePath, spec) : spec;
    }

    toExcludeGlob(useFullPath ?: boolean) : string {
        return this._useFullPath(this._toExcludeGlob(), useFullPath || false)
    }

    private _toExcludeGlob() : string {
        if (this.isDirectorySpec()) {
            return `${this.spec}/**/*`;
        } else { // this should have been basically a 
            return this.spec;
        }
    }

    toString() : string {
        return this.spec;
    }

    valueOf() : string {
        return this.toString();
    }

    setAllowTypes(...types : string[]) {
        this._allowTypes = types;
    }

    private _defaultSetAllowTypes() {
        let allowTypes = [
            '.ts',
            '.tsx',
        ]
        if (this.allowJs) {
            allowTypes.push('.js', '.jsx');
        }
        return allowTypes;
    } 

    allowTypes() : string[] {
        return this._allowTypes;
    }

    globAllowTypeString() : string {
        return '{' + this.allowTypes().map((ext) => ext.substring(1)).join(',') + '}'
    }

    hasWildCard() {
        return this.spec.indexOf('*') !== -1 && this.spec.indexOf('?') !== -1;
    }

    isRecursiveSpec() {
        return this.spec.indexOf('**/') !== -1;
    }

    isFileSpec() {
        let extname = path.extname(this._lastSeg);
        return extname !== '';
    }

    hasExtension(extname : string) {
        return this.isFileSpec() && this._lastSeg.indexOf(extname) !== -1;
    }

    private get _lastSeg() : string {
        return this._segs[this._segs.length - 1]
    }

    isDirectorySpec() {
        return !this.isWildCardSpec() && path.extname(this._lastSeg) === '';
    }

    isWildCardSpec() {
        return this._lastSeg === '*';
    }

    isRelativeSpec() {
        return this.spec[0] !== '/' || this.spec[0] === '.';
    }
}
