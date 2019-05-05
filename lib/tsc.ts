import * as Promise from 'bluebird';
import { system } from './system';
import * as glob from 'glob';
import * as fs from 'fs-extra-promise';
import * as path from 'path';

export interface FindOptions {
    exclude ?: string[];
}

function find(pattern : string, options : FindOptions) : Promise<string[]> {
    return new Promise((resolve, reject) => {
        glob(pattern, { ignore : options.exclude } , (err, matches) => {
            if (err) {
                reject(err);
            } else {
                resolve(matches);
            }
        });
    })
}

function copyFile(fromPath : string, toPath : string) : Promise<void> {
    console.log(`copy ${fromPath} => ${toPath}`);
    return fs.mkdirpAsync(path.dirname(toPath))
        .then(() => fs.copyAsync(fromPath, toPath))
}

function copyFiles(fromPaths : string[], destDir : string) : Promise<void> {
    return Promise.map(fromPaths, (fromPath) => {
        let toPath = path.join(destDir, fromPath);
        return copyFile(fromPath, toPath)
    })
        .then(() => {})
}

export function run() {
    return find(`**/*.d.ts`, { exclude : [ 'node_modules/**', 'dist/**'] })
        .then((declPaths) => {
            return copyFiles(declPaths, 'dist')
        })
        .then(() => find(`**/*.js`, { exclude : [ 'node_modules/**', 'dist/**'] }))
        .then((jsPaths) => copyFiles(jsPaths, 'dist'))
        .then(() => system(path.join(process.cwd(), '.\\node_modules\\.bin\\tsc')))    
}
