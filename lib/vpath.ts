import * as path from 'path';

export const BASE_DELIM = '/';
export const WINDOWS_DELIM = '\\';

// in linux / osx we are using /, in windows we can use / or use \.
// we want to make sure that they are correctly normalized..
export class PathObject {
    readonly filePath : string;
    constructor(filePath : string) {
        if (filePath === '') {
            throw new Error(`EmptyFilePath`)
        }
        this.filePath = path.normalize(filePath);
    }

    dirname() : PathObject {
        return new PathObject(path.dirname(this.filePath));
    }

    basename(extname ?: string) : string {
        if (extname) {
            return path.basename(this.filePath, extname);
        } else {
            return path.basename(this.filePath);
        }
    }

    extname() : string {
        return path.extname(this.filePath);
    }
    
    join(...segs : string[]) : PathObject {
        return new PathObject(path.join(this.filePath, ...segs));
    }

    relative(toPath : string) : PathObject {
        return new PathObject(path.join(this.filePath, toPath));
    }

    resolve(...pathSegments : string[]) : PathObject {
        return new PathObject(path.resolve(this.filePath, ...pathSegments))
    }

    segments() {
        return this.filePath.split(path.sep);
    }

    lastSeg() {
        let segments = this.segments()
        if (segments.length == 0)
            throw new Error(`EmptyFilePath`)
        return segments[segments.length - 1]
    }

    toOsPath() {
        return this.filePath;
    }

    toVirtualPath() {
        if (path.sep === WINDOWS_DELIM) {
            return this.filePath.replace(/\\/g, BASE_DELIM)
        } else {
            return this.filePath;
        }
    }

    toString() {
        return this.toVirtualPath();
    }

    hasDrive() {
        return this.filePath.match(/^[a-zA-Z]\:/);
    }

    isAbsolute() {
        if (path.sep === WINDOWS_DELIM && this.hasDrive()) {
            return true;
        } else {
            return this.filePath.startsWith(path.sep);
        }
    }

    isRelative() {
        return !this.isAbsolute();
    }
}

export function isAbsolute(filePath : string) : boolean {
    return new PathObject(filePath).isAbsolute();
}

export function isRelative(filePath : string) : boolean {
    return new PathObject(filePath).isRelative();
}

export function join(filePath : string, ...segs : string[]) : PathObject {
    return new PathObject(filePath).join(...segs);
}

export function relative(fromPath : string, toPath : string) : PathObject {
    return new PathObject(fromPath).relative(toPath);
}

export function resolve(filePath : string, ...segs : string[]) : PathObject {
    return new PathObject(filePath).resolve(...segs);
}

export function dirname(filePath : string) : PathObject {
    return new PathObject(filePath).dirname();
}

export function basename(filePath : string, extname ?: string) : string {
    return new PathObject(filePath).basename(extname);
}

export function extname(filePath : string) : string {
    return new PathObject(filePath).extname();
}

