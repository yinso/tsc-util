import { suite , test, timeout } from 'mocha-typescript';
import * as J from '../lib/js-watcher';
import * as C from '../lib/tsconfig';
import * as L from '../lib/logger';
import * as assert from 'assert';
import * as path from 'path';
import * as vpath from '../lib/vpath';
import * as W from '../lib/watcher';
import * as F from '../lib/tsconfig-finder';

let config : C.TsConfig;
let logger : L.ILogService;
let watchSpec : J.JsWatcherFileSpec;
let finder : F.TsConfigFinder;

@suite class JsWatcherFileSpecTest {
    @test canCreateJsWatcherFileSpec() {
        return C.loadConfig()
            .then((conf) => {
                config = conf;
                watchSpec = new J.JsWatcherFileSpec({ config })
                finder = new F.TsConfigFinder({ config })
                logger = new L.LogService({
                    logLevel: 'debug',
                    transports: [
                        L.transports.make({ type : 'console' })
                    ]
                })
            })
    }

    @test canGetIncludedDirs() {
        assert.deepEqual(watchSpec.includeDirs(), [
            vpath.join(__dirname, '..', 'bin', '**/*.js').toVirtualPath(),
            vpath.join(__dirname, '..', 'bin', '**/*.d.ts').toVirtualPath(),
            vpath.join(__dirname, '..', 'lib', '**/*.js').toVirtualPath(),
            vpath.join(__dirname, '..', 'lib', '**/*.d.ts').toVirtualPath(),
            vpath.join(__dirname, '..', 'test', '**/*.js').toVirtualPath(),
            vpath.join(__dirname, '..', 'test', '**/*.d.ts').toVirtualPath(),
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

let watcherMap : J.JsDtsWatcherMap;
let watcher : W.Watcher;

@suite class JsWatcherTest {

    @test canCreateWatcher() {
        watcherMap = new J.JsDtsWatcherMap({
            config,
            logger
        })
        assert.ok(watcherMap)
        watcher = new W.Watcher({ logger })
        assert.ok(watcher)
    }

    @timeout(3000)
    @test canRunWatcher() {
        watcher.watch(watcherMap)
        return W.WatcherMonitor.monitorWatcher({
            watcher,
            logger,
            timeout: 500
        })
    }

    @test canCloseWatcher() {
        watcher.close();
    }
}
