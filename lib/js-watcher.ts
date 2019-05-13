import * as tsConfig from './tsconfig';
import * as log from './logger';
import * as chokidar from 'chokidar';
import * as path from 'path';

export interface JsWatcherOptions {
    config : tsConfig.TsConfig;
    logger : log.ILogService;
}

// what is it that we are looking for?
export class JsWatcher {
    readonly config : tsConfig.TsConfig;
    readonly logger : log.ILogService;
    private _jsWatcher !: chokidar.FSWatcher;
    
    constructor(options : JsWatcherOptions) {
        this.config = options.config;
        this.logger = options.logger.pushScope(`JsWatcher`);
        this._jsWatcher = new chokidar.FSWatcher({
            persistent: true,
            depth: 0
        })
        this._jsWatcher.on('add', (filePath) => {
            this._onAddFile(filePath);
        })
        this._jsWatcher.on('addDir', (dirPath) => {
            this._onAddDir(dirPath)
        })
        // do not watch if they are the same
        // (because we won't be copying anything)
        if (this.config.rootDir !== this.config.outDir) {
            this._jsWatcher.add(this.config.rootDir);
        }
    }

    private _onAddFile(filePath : string) {
        this.logger.debug({
            scope: `_onAddFile`,
            args: [ filePath ],
            isIgnored : this.config.isIgnoredPath(filePath),
            matches : {
                dotJs : this._isDotJs(filePath),
                dotDDotTs : this._isDotDDotTs(filePath)
            }
        });
        if ((this._isDotDDotTs(filePath) || this._isDotJs(filePath)) && !this.config.isIgnoredPath(filePath)) {
            // we are watching it...
        } else {
            this._jsWatcher.unwatch(filePath);
        }
    }

    private _onAddDir(dirPath : string) {
        this.logger.debug({
            scope: `_onAddDir`,
            args: [ dirPath ],
            isIgnored : this.config.isIgnoredPath(dirPath)
        })
        if (!this.config.isIgnoredPath(dirPath)) {
            this._jsWatcher.add(dirPath)
        }
    }

    private _isDotJs(filePath : string) : boolean {
        return filePath.toLowerCase().endsWith('.js');
    }

    private _isDotDDotTs(filePath : string) : boolean {
        return filePath.toLowerCase().endsWith('.d.ts');
    }

}
