// import * as V from 'validac';
import * as util from 'util';
// import * as fs from 'fs-extra-promise';
// import * as objUtil from '../shared/object-util';
// import * as path from 'path';
// import * as V from 'validac';
import * as colors from 'colors/safe';

type ExplicitAny = any;
let hrtime = process.hrtime;

let extendObject = Object.assign;

const _logLevel = {
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5
};

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export const ENV_LOG_LEVEL = 'LOG_LEVEL';
export const ENV_LOG_TRACE_KEYS = 'LOG_TRACE_KEYS';

export function getDefaultLogLevel() : LogLevel {
    let logLevel = (process.env[ENV_LOG_LEVEL] || 'info').toLowerCase();
    if (!_logLevel.hasOwnProperty(logLevel)) {
        return 'info';
    } else {
        return logLevel as LogLevel;
    }
}

export function getDefaultTraceMap() {
    return (process.env[ENV_LOG_TRACE_KEYS] || '').split(/\s*,\s*/);
}

export function makeShouldLog(logLevel : LogLevel) {
    return function (level : LogLevel) {
        return _logLevel[level] >= _logLevel[logLevel];
    }
}

export interface LogTransportOptions {
    type: string;
}

// export let isLogTransportOptions = V.isTaggedObjectFactory('type', {});

export interface Transport {
    log(item : any) : void;
}

export type TransportMaker = (options : LogTransportOptions) => Transport;

// this can be written in such a way that'll be generically extended...
class TransportRegistry {
    readonly inner : {[key: string]: TransportMaker};
    constructor() {
        this.inner = {};
    }

    register(key: string, maker: TransportMaker) {
        this.inner[key] = maker;
    }

    make(options : LogTransportOptions) : Transport {
        let result = options as LogTransportOptions;
        if (this.inner.hasOwnProperty(result.type)) {
            return this.inner[options.type](options);
        } else {
            throw new Error(`UnknownTransport: ${options.type}`);
        }
    }
}

export const transports = new TransportRegistry();

interface LogData {
    [key: string]: ExplicitAny;
}
export interface ILogService {
    trace(args : LogData) : void;
    debug(args : LogData) : void;
    info(args : LogData) : void;
    warn(args : LogData) : void;
    error(args : LogData) : void;
    pushScope(scope : string, data ?: LogData, startOver ?: boolean) : ILogService;
}

export class ScopedLogService implements ILogService {
    readonly inner: ILogService;
    readonly scope : string;
    readonly data : LogData;
    constructor(inner : ILogService, scope : string, data : LogData = {}) {
        this.inner = inner;
        this.scope = scope;
        this.data = data;
    }

    private _getScope() : string {
        if (this.inner instanceof ScopedLogService) {
            let innerScope = this.inner._getScope();
            return `${innerScope}.${this.scope}`;
        } else {
            return this.scope;
        }
    }

    pushScope(scope : string, data : LogData = {}) : ScopedLogService {
        return new ScopedLogService(this, scope, extendObject(this.data, data));
    }

    trace(args : LogData) : void {
        let scope = this._getScope();
        this.inner.trace({ scope, ...this.data, ...args });
    }

    debug(args : LogData) : void {
        let scope = this._getScope();
        this.inner.debug({ scope, ...this.data, ...args });
    }

    info(args : LogData) : void {
        let scope = this._getScope();
        this.inner.info({ scope,...this.data, ...args });
    }

    warn(args : LogData) : void {
        let scope = this._getScope();
        this.inner.warn({ scope, ...this.data, ...args });
    }

    error(args : LogData) : void {
        let scope = this._getScope();
        this.inner.error({ scope, ...this.data, ...args });
    }

    toJSON() { return { $class: this.constructor.name } }
}

export interface LogServiceOptions {
    logLevel ?: LogLevel;
    scope ?: string;
    data ?: LogData;
    startTime ?: [ number , number ];
    traceKeys ?: string[];
    transports ?: Transport[];
}

export class LogService implements ILogService {
    readonly scope : string;
    readonly logLevel : LogLevel;
    readonly startTime : [ number , number ]; // for handling hrtime.
    readonly shouldLog : (logLevel : LogLevel) => boolean;
    readonly data : LogData;
    readonly transports : Transport[];
    constructor(options : LogServiceOptions = { logLevel : getDefaultLogLevel() , scope : '', startTime: hrtime(), data : {} , traceKeys: [], transports : [] }) {
        this.logLevel = options.logLevel || getDefaultLogLevel();
        this.scope = options.scope || '';
        this.transports = options.transports || []; // how do I pass this in?
        this.data = options.data || {};
        this.startTime = options.startTime || hrtime(); // what do we do in the browser?
        this.shouldLog = makeShouldLog(this.logLevel);
    }

    private _genScope(scope: string) : string {
        if (this.scope === '')
            return scope;
        else
            return [ this.scope, scope ].join('.');
    }

    pushScope(scope : string, data : LogData = {}, startOver : boolean = false) : LogService {
        return new LogService({
            scope: this._genScope(scope),
            logLevel: this.logLevel,
            transports: this.transports,
            startTime: startOver ? hrtime() : this.startTime,
            data: extendObject(this.data, data),
        })
    }

    trace(args : LogData) : void {
        this._log('trace', args);
    }

    debug(args : LogData) : void {
        this._log('debug', args);
    }

    info(args : LogData) : void {
        this._log('info', args);
    }

    warn(args : LogData) : void {
        this._log('warn', args);
    }

    error(args : LogData) : void {
        this._log('error', args);
    }

    traceObject<T>(obj : T) : T {
        let logger = this;
        let ctor = obj.constructor;
        let cls = class {
            readonly logger : ILogService;
            constructor() {
                this.logger = logger;
                let keys = getDefaultTraceMap();
                Object.keys(ctor.prototype).forEach((key) => {
                    // this could be a getter / setter, accessing via descriptor won't trigger the call.
                    let clsProp =  Object.getOwnPropertyDescriptor(ctor.prototype, key)
                    if (clsProp && typeof(clsProp.value) === 'function') {
                        let clsFunc = clsProp.value;
                        let scope = [ ctor.name , key ].join('.');
                        if (isInTraceKey(scope, keys)) {
                            let objProp = Object.getOwnPropertyDescriptor(this, key);
                            if (!(objProp && typeof(objProp.value) === 'function' && objProp.value[PROP_TRACEABLE])) {
                                let objFunc = (...args : any[]) => {
                                    if (this.logger) {
                                        (this.logger as ExplicitAny)._reallyLog('trace', {
                                            scope: key,
                                            args: args
                                        })
                                    }
                                    return clsFunc.apply(this, args);
                                };
                                Object.defineProperty(objFunc, PROP_TRACEABLE, {
                                    configurable: false,
                                    enumerable: true,
                                    writable: false,
                                    value: true
                                })
                                Object.defineProperty(this, key, {
                                    configurable: false,
                                    enumerable: false,
                                    writable: false,
                                    value: objFunc
                                });
                            }
                        }
                    }
                })
            }
        }
        Object.defineProperty(cls, 'prototype', {
            value: obj
        })
        Object.defineProperty(cls, 'name', {
            value: obj.constructor.name
        })
        return (new cls() as ExplicitAny) as T;
    }

    private _log(level : LogLevel, object : {[key: string] : ExplicitAny}) : void {
        if (this.shouldLog(level)) {
            this._reallyLog(level, object);
        }
    }

    private _reallyLog(level : LogLevel, object : {[key: string] : ExplicitAny}) : void {
        let [ scope , normalized ] = this._normalize(object);
        let result = { scope, level, ...this.data, ...normalized , elapsed : hrtime(this.startTime) , ts : Date.now() }
        this.transports.forEach((transport) => transport.log(result));
    }

    private _normalize(object: {[key: string]: ExplicitAny}) : [ string, {[key: string]: ExplicitAny}] {
        let scope = this.scope;
        let processed = Object.keys(object).reduce((acc, key) => {
            if (key === 'scope') {
                scope = [ scope, object[key] ].join('.');
            } else {
                acc[key] = object[key];
            }
            return acc;
        }, {} as {[key: string]: ExplicitAny});
        return [ scope, processed ];
    }

    toJSON() { return { $class: this.constructor.name } }
}

interface LoggerConstructor<T> {
    //readonly logger : ILogService;
    new(...args : ExplicitAny[]) : T;
}

function isInTraceKey(scope : string, keys : string[]) {
    return getDefaultLogLevel() === 'trace' || !!keys.find(key => key === '*' || scope.indexOf(key) > -1);
}

const PROP_TRACEABLE = '_traceable';

export function tracedClass<T extends LoggerConstructor<ExplicitAny>>(ctor : T) : T {
    let cls = class extends ctor {
        constructor(...args: any[]) {
            super(...args);
            let keys = getDefaultTraceMap();
            Object.keys(ctor.prototype).forEach((key) => {
                // this could be a getter / setter, accessing via descriptor won't trigger the call.
                let clsProp =  Object.getOwnPropertyDescriptor(ctor.prototype, key)
                if (clsProp && typeof(clsProp.value) === 'function') {
                    let clsFunc = clsProp.value;
                    let scope = [ ctor.name , key ].join('.');
                    if (isInTraceKey(scope, keys)) {
                        let objProp = Object.getOwnPropertyDescriptor(this, key);
                        if (!(objProp && typeof(objProp.value) === 'function' && objProp.value[PROP_TRACEABLE])) {
                            let objFunc = (...args : any[]) => {
                                if (this.logger) {
                                    this.logger._reallyLog('trace', {
                                        scope: key,
                                        args: args
                                    })
                                }
                                return clsFunc.apply(this, args);
                            };
                            Object.defineProperty(objFunc, PROP_TRACEABLE, {
                                configurable: false,
                                enumerable: true,
                                writable: false,
                                value: true
                            })
                            Object.defineProperty(this, key, {
                                configurable: false,
                                enumerable: false,
                                writable: false,
                                value: objFunc
                            });
                        }
                    }
                }
            })
        }
    }
    return cls;
}
interface UtilInspectConsoleOptions extends LogTransportOptions {
    type: 'console'
}

// let isUtilInspectConsoleOptions = isLogTransportOptions.register<'console', UtilInspectConsoleOptions>('console', {});

class UtilInspectTransport implements Transport {
    log(item : any) : void {
        // item = objUtil.decycle(item)
        let colorFunc = this._getColor(item);
        let firstLine = this._prepFirstLine(item);
        let restLine = this._prepSecondLine(item);
        console.log(colorFunc([ firstLine, restLine].join('\n')))
    }

    private _prepFirstLine(item : ExplicitAny) : string {
        return `*** [${colors.bold(item.level)}] ${colors.bold(item.scope)}: (${new Date(item.ts).toISOString()}) / [${item.elapsed.join(', ')}]`;
    }

    private _prepSecondLine(item : ExplicitAny) : string {
        let obj = Object.keys(item).reduce((acc, key) => {
            if (['scope', 'level', 'ts', 'elapsed'].indexOf(key) === -1) {
                acc[key] = item[key];
            }
            return acc;
        }, {} as {[key: string]: ExplicitAny});
        return util.inspect(obj, { depth : null, colors: true });
    }

    private _getColor(item : ExplicitAny) : (str : string) => string {
        switch (item.level) {
            case 'trace':
                return colors.cyan;
            case 'debug':
                return colors.green;
            case 'info':
                return colors.white;
            case 'warn':
                return colors.yellow;
            case 'error':
                return colors.red;
            default:
                return colors.white;
        }
    }
}

transports.register('console', (options) => new UtilInspectTransport())

