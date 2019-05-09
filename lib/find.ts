import * as Promise from 'bluebird';
import * as glob from 'glob';

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