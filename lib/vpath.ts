import * as path from 'path';
import * as os from 'os';
import { pathToFileURL } from 'url';

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

    basename() : string {
        return path.basename(this.filePath);
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
