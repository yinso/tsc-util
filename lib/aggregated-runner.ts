import * as L from './logger';
// import * as tsConf from './tsconfig';
import * as W from './watcher';
import * as js from './js-watcher';
import * as tsc from './tsc';


export class AggregatedWatchRunner {
    readonly runnerMap: {[spec : string]: W.WatcherMap};
    readonly watcher : W.Watcher;
    constructor(options : tsc.RunOptions) {
        this.runnerMap = {};
        this.watcher = new W.Watcher(options);
    }

    // add runner.
    addRunner(runner : W.WatcherMap) {
          
    }
}