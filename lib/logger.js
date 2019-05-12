"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
// import * as V from 'validac';
var util = require("util");
// import * as fs from 'fs-extra-promise';
// import * as objUtil from '../shared/object-util';
// import * as path from 'path';
// import * as V from 'validac';
var colors = require("colors/safe");
var hrtime = process.hrtime;
var extendObject = Object.assign;
var _logLevel = {
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5
};
exports.ENV_LOG_LEVEL = 'LOG_LEVEL';
exports.ENV_LOG_TRACE_KEYS = 'LOG_TRACE_KEYS';
function getDefaultLogLevel() {
    var logLevel = (process.env[exports.ENV_LOG_LEVEL] || 'info').toLowerCase();
    if (!_logLevel.hasOwnProperty(logLevel)) {
        return 'info';
    }
    else {
        return logLevel;
    }
}
exports.getDefaultLogLevel = getDefaultLogLevel;
function getDefaultTraceMap() {
    return (process.env[exports.ENV_LOG_TRACE_KEYS] || '').split(/\s*,\s*/);
}
exports.getDefaultTraceMap = getDefaultTraceMap;
function makeShouldLog(logLevel) {
    return function (level) {
        return _logLevel[level] >= _logLevel[logLevel];
    };
}
exports.makeShouldLog = makeShouldLog;
// this can be written in such a way that'll be generically extended...
var TransportRegistry = /** @class */ (function () {
    function TransportRegistry() {
        this.inner = {};
    }
    TransportRegistry.prototype.register = function (key, maker) {
        this.inner[key] = maker;
    };
    TransportRegistry.prototype.make = function (options) {
        var result = options;
        if (this.inner.hasOwnProperty(result.type)) {
            return this.inner[options.type](options);
        }
        else {
            throw new Error("UnknownTransport: " + options.type);
        }
    };
    return TransportRegistry;
}());
exports.transports = new TransportRegistry();
var ScopedLogService = /** @class */ (function () {
    function ScopedLogService(inner, scope, data) {
        if (data === void 0) { data = {}; }
        this.inner = inner;
        this.scope = scope;
        this.data = data;
    }
    ScopedLogService.prototype._getScope = function () {
        if (this.inner instanceof ScopedLogService) {
            var innerScope = this.inner._getScope();
            return innerScope + "." + this.scope;
        }
        else {
            return this.scope;
        }
    };
    ScopedLogService.prototype.pushScope = function (scope, data) {
        if (data === void 0) { data = {}; }
        return new ScopedLogService(this, scope, extendObject(this.data, data));
    };
    ScopedLogService.prototype.trace = function (args) {
        var scope = this._getScope();
        this.inner.trace(__assign({ scope: scope }, this.data, args));
    };
    ScopedLogService.prototype.debug = function (args) {
        var scope = this._getScope();
        this.inner.debug(__assign({ scope: scope }, this.data, args));
    };
    ScopedLogService.prototype.info = function (args) {
        var scope = this._getScope();
        this.inner.info(__assign({ scope: scope }, this.data, args));
    };
    ScopedLogService.prototype.warn = function (args) {
        var scope = this._getScope();
        this.inner.warn(__assign({ scope: scope }, this.data, args));
    };
    ScopedLogService.prototype.error = function (args) {
        var scope = this._getScope();
        this.inner.error(__assign({ scope: scope }, this.data, args));
    };
    ScopedLogService.prototype.toJSON = function () { return { $class: this.constructor.name }; };
    return ScopedLogService;
}());
exports.ScopedLogService = ScopedLogService;
var LogService = /** @class */ (function () {
    function LogService(options) {
        if (options === void 0) { options = { logLevel: getDefaultLogLevel(), scope: '', startTime: hrtime(), data: {}, traceKeys: [], transports: [] }; }
        this.logLevel = options.logLevel || getDefaultLogLevel();
        this.scope = options.scope || '';
        this.transports = options.transports || []; // how do I pass this in?
        this.data = options.data || {};
        this.startTime = options.startTime || hrtime(); // what do we do in the browser?
        this.shouldLog = makeShouldLog(this.logLevel);
    }
    LogService.prototype._genScope = function (scope) {
        if (this.scope === '')
            return scope;
        else
            return [this.scope, scope].join('.');
    };
    LogService.prototype.pushScope = function (scope, data, startOver) {
        if (data === void 0) { data = {}; }
        if (startOver === void 0) { startOver = false; }
        return new LogService({
            scope: this._genScope(scope),
            logLevel: this.logLevel,
            transports: this.transports,
            startTime: startOver ? hrtime() : this.startTime,
            data: extendObject(this.data, data),
        });
    };
    LogService.prototype.trace = function (args) {
        this._log('trace', args);
    };
    LogService.prototype.debug = function (args) {
        this._log('debug', args);
    };
    LogService.prototype.info = function (args) {
        this._log('info', args);
    };
    LogService.prototype.warn = function (args) {
        this._log('warn', args);
    };
    LogService.prototype.error = function (args) {
        this._log('error', args);
    };
    LogService.prototype.traceObject = function (obj) {
        var logger = this;
        var ctor = obj.constructor;
        var cls = /** @class */ (function () {
            function class_1() {
                var _this = this;
                this.logger = logger;
                var keys = getDefaultTraceMap();
                Object.keys(ctor.prototype).forEach(function (key) {
                    // this could be a getter / setter, accessing via descriptor won't trigger the call.
                    var clsProp = Object.getOwnPropertyDescriptor(ctor.prototype, key);
                    if (clsProp && typeof (clsProp.value) === 'function') {
                        var clsFunc_1 = clsProp.value;
                        var scope = [ctor.name, key].join('.');
                        if (isInTraceKey(scope, keys)) {
                            var objProp = Object.getOwnPropertyDescriptor(_this, key);
                            if (!(objProp && typeof (objProp.value) === 'function' && objProp.value[PROP_TRACEABLE])) {
                                var objFunc = function () {
                                    var args = [];
                                    for (var _i = 0; _i < arguments.length; _i++) {
                                        args[_i] = arguments[_i];
                                    }
                                    if (_this.logger) {
                                        _this.logger._reallyLog('trace', {
                                            scope: key,
                                            args: args
                                        });
                                    }
                                    return clsFunc_1.apply(_this, args);
                                };
                                Object.defineProperty(objFunc, PROP_TRACEABLE, {
                                    configurable: false,
                                    enumerable: true,
                                    writable: false,
                                    value: true
                                });
                                Object.defineProperty(_this, key, {
                                    configurable: false,
                                    enumerable: false,
                                    writable: false,
                                    value: objFunc
                                });
                            }
                        }
                    }
                });
            }
            return class_1;
        }());
        Object.defineProperty(cls, 'prototype', {
            value: obj
        });
        Object.defineProperty(cls, 'name', {
            value: obj.constructor.name
        });
        return new cls();
    };
    LogService.prototype._log = function (level, object) {
        if (this.shouldLog(level)) {
            this._reallyLog(level, object);
        }
    };
    LogService.prototype._reallyLog = function (level, object) {
        var _a = this._normalize(object), scope = _a[0], normalized = _a[1];
        var result = __assign({ scope: scope, level: level }, this.data, normalized, { elapsed: hrtime(this.startTime), ts: Date.now() });
        this.transports.forEach(function (transport) { return transport.log(result); });
    };
    LogService.prototype._normalize = function (object) {
        var scope = this.scope;
        var processed = Object.keys(object).reduce(function (acc, key) {
            if (key === 'scope') {
                scope = [scope, object[key]].join('.');
            }
            else {
                acc[key] = object[key];
            }
            return acc;
        }, {});
        return [scope, processed];
    };
    LogService.prototype.toJSON = function () { return { $class: this.constructor.name }; };
    return LogService;
}());
exports.LogService = LogService;
function isInTraceKey(scope, keys) {
    return getDefaultLogLevel() === 'trace' || !!keys.find(function (key) { return key === '*' || scope.indexOf(key) > -1; });
}
var PROP_TRACEABLE = '_traceable';
function tracedClass(ctor) {
    var cls = /** @class */ (function (_super) {
        __extends(class_2, _super);
        function class_2() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _this = _super.apply(this, args) || this;
            var keys = getDefaultTraceMap();
            Object.keys(ctor.prototype).forEach(function (key) {
                // this could be a getter / setter, accessing via descriptor won't trigger the call.
                var clsProp = Object.getOwnPropertyDescriptor(ctor.prototype, key);
                if (clsProp && typeof (clsProp.value) === 'function') {
                    var clsFunc_2 = clsProp.value;
                    var scope = [ctor.name, key].join('.');
                    if (isInTraceKey(scope, keys)) {
                        var objProp = Object.getOwnPropertyDescriptor(_this, key);
                        if (!(objProp && typeof (objProp.value) === 'function' && objProp.value[PROP_TRACEABLE])) {
                            var objFunc = function () {
                                var args = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    args[_i] = arguments[_i];
                                }
                                if (_this.logger) {
                                    _this.logger._reallyLog('trace', {
                                        scope: key,
                                        args: args
                                    });
                                }
                                return clsFunc_2.apply(_this, args);
                            };
                            Object.defineProperty(objFunc, PROP_TRACEABLE, {
                                configurable: false,
                                enumerable: true,
                                writable: false,
                                value: true
                            });
                            Object.defineProperty(_this, key, {
                                configurable: false,
                                enumerable: false,
                                writable: false,
                                value: objFunc
                            });
                        }
                    }
                }
            });
            return _this;
        }
        return class_2;
    }(ctor));
    return cls;
}
exports.tracedClass = tracedClass;
// let isUtilInspectConsoleOptions = isLogTransportOptions.register<'console', UtilInspectConsoleOptions>('console', {});
var UtilInspectTransport = /** @class */ (function () {
    function UtilInspectTransport() {
    }
    UtilInspectTransport.prototype.log = function (item) {
        // item = objUtil.decycle(item)
        var colorFunc = this._getColor(item);
        var firstLine = this._prepFirstLine(item);
        var restLine = this._prepSecondLine(item);
        console.log(colorFunc([firstLine, restLine].join('\n')));
    };
    UtilInspectTransport.prototype._prepFirstLine = function (item) {
        return "*** [" + colors.bold(item.level) + "] " + colors.bold(item.scope) + ": (" + new Date(item.ts).toISOString() + ") / [" + item.elapsed.join(', ') + "]";
    };
    UtilInspectTransport.prototype._prepSecondLine = function (item) {
        var obj = Object.keys(item).reduce(function (acc, key) {
            if (['scope', 'level', 'ts', 'elapsed'].indexOf(key) === -1) {
                acc[key] = item[key];
            }
            return acc;
        }, {});
        return util.inspect(obj, { depth: null, colors: true });
    };
    UtilInspectTransport.prototype._getColor = function (item) {
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
    };
    return UtilInspectTransport;
}());
exports.transports.register('console', function (options) { return new UtilInspectTransport(); });
//# sourceMappingURL=logger.js.map