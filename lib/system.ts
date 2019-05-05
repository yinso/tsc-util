import * as cp from 'child_process';
import * as Promise from 'bluebird';

export interface SystemResult {
    stdout : string;
    stderr : string;
}

export interface SystemException extends cp.ExecException {
    stderr : string;
}

export function system(cmd : string) : Promise<SystemResult> {
    return new Promise((resolve, reject) => {
        cp.exec(cmd, (err, stdout, stderr) => {
            if (err) {
                (err as SystemException).stderr = stderr;
                reject(err);
            } else {
                resolve({ stdout , stderr })
            }
        })
    })
}
