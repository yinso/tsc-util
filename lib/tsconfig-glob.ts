import * as vpath from './vpath';
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
    allowTypes ?: string[];
}

export class TsConfigGlob {
    readonly spec : vpath.PathObject;
    readonly basePath : vpath.PathObject;
    readonly allowTypes : string[];
    constructor(options : TsConfigGlobOptions) {
        this.spec = new vpath.PathObject(options.spec);
        this.basePath = new vpath.PathObject(options.basePath || process.cwd());
        this.allowTypes = options.allowTypes ? options.allowTypes : options.allowJs ? ['.ts', '.tsx', '.js', '.jsx'] : ['.ts', '.tsx'];
    }

    toFullPath() {
        return this.basePath.join(this.spec.toVirtualPath());
    }

    toRegExp(useFullPath : boolean = false) : RegExp {
        // we are matching on / as the separator.
        if (useFullPath) {
            let segs = this.basePath.segments().concat(this.spec.segments());
            return new RegExp(`^` + segs.map((seg) => this._segToRegEx(seg)).join('\\/'))
        } else {
            let segs = this.spec.segments();
            return new RegExp(`\\/` + segs.map((seg) => this._segToRegEx(seg)).join('\\/'))
        }
    }

    match(filePath : string) : boolean {
        filePath = new vpath.PathObject(filePath).toVirtualPath();
        let matched = filePath.match(this.toRegExp())
        return !!matched;
    }

    isRecursiveSpec() : boolean {
        let segments = this.spec.segments()
        let seg = segments.find((seg) => seg === '**')
        return !!seg;
    }

    isFileSpec() : boolean {
        let extname = this.spec.extname()
        return extname !== '';
    }

    hasExtension(extname : string) : boolean {
        return this.spec.lastSeg().endsWith(extname)
    }

    hasWildCard() : boolean {
        let segments = this.spec.segments()
        let seg = segments.find((seg) => {
            return seg !== '**' && (seg.indexOf('*') !== -1 || seg.indexOf('?') !== -1);
        })
        return !!seg;
    }

    isDirectorySpec() {
        return !this.isWildCardSpec() && this.spec.extname() === '';
    }

    isWildCardSpec(seg : string = this.spec.lastSeg()) {
        return seg === '*' || seg === '**';
    }
    toIncludeGlob(useFullPath ?: boolean) : string {
        // if ends in directory name.
        return this._useFullPath(this._toIncludeGlob(), useFullPath || false);
    }

    toExcludeGlob(useFullPath ?: boolean) : string {
        return this._useFullPath(this._toExcludeGlob(), useFullPath || false)
    }

    toJsWatcherDirPath(useFullPath : boolean = true) : string {
        // what are we looking for? the following.
        // a single dir path
        if (this.isDirectorySpec()) {
            return this._useFullPath(this.spec.toVirtualPath(), useFullPath, false);
        } else if (this.isWildCardSpec()) {
            // wildcard spec ends in *, and or could be a directory.
            // strip out the parts that are mean
            return this._useFullPath(this._stripWildCard(), useFullPath, false);
        } else { // if this is a file - what do we do? return itself.
            return this._useFullPath(this.spec.toVirtualPath(), useFullPath, false);
        }
    }

    toJsWatcherDirPaths(useFullPath : boolean = true) : string[] {
        if (this.isDirectorySpec()) {
            return [ '.js', '.d.ts' ].map((extname) => {
                let dirPath = this._useFullPath(this.spec.toVirtualPath(), useFullPath, true);
                return `${dirPath}/**/*${extname}`;
            })
        } else if (this.isWildCardSpec()) {
            // wildcard spec ends in *, and or could be a directory.
            // strip out the parts that are mean
            return [ '.js', '.d.ts' ].map((extname) => {
                let dirPath = this._useFullPath(this._stripWildCard(), useFullPath, true);
                return `${dirPath}/**/*${extname}`;
            });
        } else { // if this is a file - what do we do? return itself.
            return [ this._useFullPath(this.spec.toVirtualPath(), useFullPath, true) ];
        }
    }

    private _toExcludeGlob() : string {
        if (this.isDirectorySpec()) {
            return `${this.spec.toVirtualPath()}/**/*`;
        } else { // this should have been basically a 
            return this.spec.toVirtualPath();
        }
    }

    private _stripWildCard() {
        if (this.hasWildCard()) {
            let segments = this.spec.segments();
            segments.pop();
            return new vpath.PathObject(segments.join(vpath.BASE_DELIM)).toVirtualPath();
        } else {
            return this.spec.toVirtualPath();
        }
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
            return this.spec.toVirtualPath();
        }
    }

    globAllowTypeString() : string {
        return '{' + this.allowTypes.map((ext) => ext.substring(1)).join(',') + '}'
    }

    private _useFullPath(spec : string, useFullPath : boolean, useVPath : boolean = true) {
        if (useFullPath) {
            let joinedPath = this.basePath.join(spec);
            if (useVPath) {
                return joinedPath.toVirtualPath();
            } else {
                return joinedPath.toOsPath();
            }
        } else {
            return spec;
        }
    }

    private _segToRegEx(seg : string) : string {
        // https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
        // * matches zero or more characters (excluding directory separators)
        // ? matches any one character (excluding directory separators)
        // **/ recursively matches any subdirectory

        if (seg === '**') {
            return `(.*)?`;
        } else {
            return seg.replace(/\?/g, '[^\/]?')
                .replace(/\*/g, '([^\/]*)?')
                .replace(/\./g, '\\.');
        }
    }
}
