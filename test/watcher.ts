import { suite , test , timeout } from 'mocha-typescript';
import * as Promise from 'bluebird';
import * as log from '../lib/logger';
import * as W from '../lib/watcher';
import { fileURLToPath } from 'url';

let logger = new log.LogService({
    scope: 'WatcherTest',
    logLevel: 'trace',
    transports: [
        log.transports.make({type: 'console'})
    ]
})

let watcher1 : W.Watcher;

@suite class WatcherTest {
    
    @test canStartWatcher() {
        watcher1 = new W.Watcher({
            logger,
        })
        return Promise.resolve()
    }

    @timeout(3000)
    @test canWatchStarDotJs() {
        watcher1.watch({
            spec: 'lib/**/*.js',
            onAdd: (filePath) => {
                logger.info({
                    watching: filePath
                })
                return Promise.resolve()
            },
            onChange: (filePath) => {
                logger.info({
                    watching: filePath
                })
                return Promise.resolve()
            },
            onUnlink: (filePath) => {
                logger.info({
                    watching: filePath
                })
                return Promise.resolve()
            },
        })
        return W.WatcherMonitor.monitorWatcher({
            watcher: watcher1,
            logger,
            timeout: 500
        })
    }

    @test canClose() {
        watcher1.close();
    }
}
