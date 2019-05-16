import { suite , test } from 'mocha-typescript';
import * as J from '../lib/js-watcher';
import * as C from '../lib/tsconfig';
import * as L from '../lib/logger';

let watcher : J.JsWatcher;

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
