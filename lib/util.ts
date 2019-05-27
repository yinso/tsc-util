import * as Promise from 'bluebird';
import * as glob from 'glob';
import * as fs from 'fs-extra-promise';
import * as path from 'path';

export function copyFile(fromPath : string, toPath : string) : Promise<void> {
    return fs.mkdirpAsync(path.dirname(toPath))
        .then(() => fs.copyAsync(fromPath, toPath))
}

export function readFile(filePath : string) : Promise<string> {
    return fs.readFileAsync(filePath, 'utf8');
}

export function writeFile(filePath : string, data : string) : Promise<void> {
    return fs.writeFileAsync(filePath, data, 'utf8')
}

export function rmrf(filePath : string) : Promise<void> {
    return fs.removeAsync(filePath);
}

export interface FindOptions {
    cwd ?: string;
    exclude ?: string[];
    fullPath ?: boolean;
}

export function find(pattern : string | string[], options : FindOptions) : Promise<string[]> {
    let patterns = typeof(pattern) === 'string' ? [ pattern ] : pattern;
    return Promise.map(patterns, (pattern : string) => _findOne(pattern, options))
        .then((results : string[][]) => _unique(results))
}

function _unique<T>(ars : T[][]) : T[] {
    let map = new Map<T, boolean>();
    return ars.reduce((acc, ary) => {
        ary.forEach((item) => {
            if (!map.has(item)) {
                map.set(item, true);
                acc.push(item);
            }
        })
        return acc;
    }, [] as T[]);
}

function _findOne(pattern : string, options : FindOptions) : Promise<string[]> {
    let globOptions : glob.IOptions = {
        cwd : options.cwd || process.cwd(),
        ignore : options.exclude || [],
        realpath : typeof(options.fullPath) === 'boolean' ? options.fullPath :  false
    }
    return new Promise((resolve, reject) => {
        glob(pattern, globOptions, (err, matches) => {
            if (err) {
                reject(err);
            } else {
                resolve(matches);
            }
        });
    })
}