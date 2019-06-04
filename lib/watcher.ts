import * as Promise from 'bluebird';
import * as chokidar from 'chokidar';
import * as anymatch from './anymatch';
import * as events from 'events';
import * as log from './logger';

export interface WatcherOptions {
    logger : log.ILogService;
}

export type FileTransformProc = (filePath : string) => Promise<void>;

export interface WatcherMap {
    spec : string | string[];
    onAdd: FileTransformProc;
    onChange : FileTransformProc;
    onUnlink : FileTransformProc;
}

export class Watcher extends events.EventEmitter {
    readonly logger : log.ILogService;
    private _watcher : chokidar.FSWatcher;
    private _transformMap : {[spec : string]: WatcherMap };
    
    constructor(options : WatcherOptions) {
        super();
        this.logger = options.logger;
        this._watcher = new chokidar.FSWatcher({
            persistent: true,
            ignorePermissionErrors: true
        })
        this._transformMap = {}
        this._watcher
            .on('add', (filePath) => {
                this._onAddFile(filePath);
            })
            .on('change', (filePath) => {
                this._onChangeFile(filePath);
            })
            .on('unlink', (filePath) => {
                this._onUnlinkFile(filePath);
            })
            .on('error', (e : Error) => {
                this._onError(e);
            })
    }

    watch(options : WatcherMap) {
        if (typeof(options.spec) === 'string') {
            this._transformMap[options.spec] = options;
            this._watcher.add(options.spec); // this will trigger the watching.
        } else {
            options.spec.forEach((spec) => {
                this.watch({
                    ...options,
                    spec,
                })
            })
        }
    }

    close() {
        this._watcher.close();
    }

    // getWatched() {
    //     // this is not a good pass through.
    //     let watched = this._watcher.getWatched();
    //     return watched;
    // }

    private _onAddFile(filePath : string) : void {
        this.logger.debug({
            scope: `_onAddFile`,
            args: [ filePath ],
        });
        try {
            this.emit('add', filePath)
            let options = this._mapFile(filePath);
            options.onAdd(filePath)
                .then(() => {
                    this.emit('added', filePath)
                    return null;
                })
                .catch((e) => {
                    this.emit('error', e)
                    return null;
                })
        } catch (e) {
            this._watcher.emit('error', e);
            this.emit('error', e)
        }
    }

    private _onChangeFile(filePath : string) : void {
        this.logger.debug({
            scope: `_onChangeFile`,
            args: [ filePath ],
        });
        try {
            this.emit('change', filePath)
            let options = this._mapFile(filePath);
            options.onChange(filePath)
                .then(() => {
                    this.emit('changed', filePath);
                    return null
                })
                .catch((e) => {
                    this.emit('error', e)
                    return null;
                })
        } catch (e) {
            this._watcher.emit('error', e);
            this.emit('error', e)
        }
    }

    private _onUnlinkFile(filePath : string) : void {
        this.logger.debug({
            scope: '_onUnlinkFile',
            args: [ filePath ]
        })
        try {
            this.emit('unlink', filePath)
            let options = this._mapFile(filePath);
            options.onUnlink(filePath)
                .then(() => {
                    this.emit('unlinked', filePath)
                    this._watcher.unwatch(filePath);
                    return null;
                })
                .catch((e) => {
                    this.emit('error', e)
                    return null;
                })
        } catch (e) {
            this._watcher.emit('error', e);
            this.emit('error', e)
        }
    }

    private _mapFile(filePath : string) : WatcherMap {
        let result = Object.keys(this._transformMap).find((spec : string) => {
            let matchers = anymatch.anymatch(spec);
            return anymatch.anymatch(matchers, filePath);
        })
        if (result) {
            return this._transformMap[result];
        } else {
            this._watcher.unwatch(filePath);
            throw new Error(`UnwatchedFilePath: ${filePath}`)
        }
    }

    private _onError(e : Error) : void {
        this.logger.error({
            scope: '_onError',
            error: e
        });
    }
}

export interface WatcherMonitorOptions {
    watcher : Watcher;
    logger:  log.ILogService;
    timeout : number;
}

export class WatcherMonitor {
    readonly watcher : Watcher;
    readonly logger : log.ILogService;
    readonly timeout : number;
    readonly promise : Promise<void>;
    private _resolve !: () => void;
    private _reject !: () => void;
    private _timeoutHandle !: NodeJS.Timeout;
    constructor(options : WatcherMonitorOptions) {
        this.watcher = options.watcher;
        this.logger = options.logger;
        this.timeout = options.timeout;
        this._cancelTimer = this._cancelTimer.bind(this);
        this.watcher.on('add', this._cancelTimer)
            .on('change', this._cancelTimer)
            .on('unlink', this._cancelTimer)
        // we are first going to get a raw Promise.
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        })
        this._startTimer();
    }

    _startTimer() {
        this._timeoutHandle = setTimeout(() => {
            if (this._resolve) {
                this.close();
            }
            else {
                // otherwise it errors!
                this.logger.warn({
                    scope: '_startTimer:TIMEOUT',
                    message: `No _resolve function ready`
                })
            }
        }, this.timeout)
    }

    private _cancelTimer() {
        clearTimeout(this._timeoutHandle);
        this._startTimer();
    }

    close() {
        this.watcher.removeListener('add', this._cancelTimer)
            .removeListener('change', this._cancelTimer)
            .removeListener('unlink', this._cancelTimer)
        this._resolve();
    }

    static monitorWatcher(options : WatcherMonitorOptions) : Promise<void> {
        let watcherDone = new WatcherMonitor(options);
        return watcherDone.promise;
    }
}
