import { suite , test } from 'mocha-typescript';
import * as J from '../lib/js-watcher';
import * as C from '../lib/tsconfig';
import * as L from '../lib/logger';
import * as assert from 'assert';
import * as path from 'path';

let watcher : J.JsWatcher;
let watchSpec : J.JsWatcherFileSpec

@suite class JsWatcherFileSpecTest {
    @test canCreateJsWatcherFileSpec() {
        return C.loadConfig()
            .then((config) => {
                watchSpec = new J.JsWatcherFileSpec({ config })
            })
    }

    @test canGetIncludedDirs() {
        assert.deepEqual(watchSpec.includeDirs(), [
            path.join(__dirname, '..', 'bin'),
            path.join(__dirname, '..', 'lib'),
            path.join(__dirname, '..', 'test'),
        ])
    }

    @test isInIgnoredPaths() {
        let ignoredPaths = [
            path.join(__dirname, 'node_modules'),
            path.join(__dirname, '.git'),
            path.join(__dirname, 'dist'),
        ]
        ignoredPaths.forEach((ignoredPath) => {
            assert.ok(watchSpec.isIgnoredPath(ignoredPath), `${ignoredPath} should be ignored`)
        })
    }
}

@suite class JsWatcherTest {

    @test canCreateWatcher() {
        return C.loadConfig()
            .then((config) => {
                let logger = new L.LogService({
                    //logLevel: 'debug',
                    transports: [
                        L.transports.make({ type : 'console' })
                    ]
                })
                // watcher = new J.JsWatcher({
                //     config,
                //     logger
                // })
                // return watcher;
            })
    }

}
