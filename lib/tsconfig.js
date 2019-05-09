"use strict";
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
var fs = require("fs-extra-promise");
var ts = require("typescript");
var path = require("path");
var find_1 = require("./find");
function convertLibs(libs) {
    return libs.map(function (lib) { return "lib." + lib + ".d.ts"; });
}
function convertTarget(target) {
    switch (target.toLowerCase()) {
        case 'es3':
            return ts.ScriptTarget.ES3;
        case 'es5':
            return ts.ScriptTarget.ES5;
        case 'es2015':
            return ts.ScriptTarget.ES2015;
        case 'es2016':
            return ts.ScriptTarget.ES2016;
        case 'es2017':
            return ts.ScriptTarget.ES2017;
        case 'es2018':
            return ts.ScriptTarget.ES2018;
        // case 'es2019': // not in 3.0.3 (in 3.4.5)
        //     return ts.ScriptTarget.ES2019;
        case 'esnext':
            return ts.ScriptTarget.ESNext;
        default:
            return ts.ScriptTarget.Latest;
    }
}
function convertJsx(jsx) {
    switch (jsx) {
        case 'preserve':
            return ts.JsxEmit.Preserve;
        case 'react':
            return ts.JsxEmit.React;
        case 'react-native':
            return ts.JsxEmit.ReactNative;
        default:
            return ts.JsxEmit.None;
    }
}
function jsonToTsCompilerOptions(json) {
    var transformMap = {
        jsx: convertJsx,
        lib: convertLibs,
        target: convertTarget,
    };
    var result = Object.keys(json).reduce(function (acc, key) {
        if (transformMap.hasOwnProperty(key)) {
            acc[key] = transformMap[key](json[key]);
        }
        else {
            acc[key] = json[key];
        }
        return acc;
    }, {});
    if (!result.rootDir) {
        result.rootDir = '.';
    }
    if (!result.outDir) {
        result.outDir = '.';
    }
    return result;
}
// this isn't how it works, I think.
var TsConfig = /** @class */ (function () {
    function TsConfig(options) {
        this.basePath = options.basePath;
        this.configName = options.configName;
        this._compilerOptions = options.compilerOptions;
        this._exclude = options.exclude;
        this._prevConfig = options.prevConfig;
    }
    Object.defineProperty(TsConfig.prototype, "compilerOptions", {
        get: function () {
            if (this._prevConfig) {
                return Object.assign({}, this._prevConfig.compilerOptions, this._compilerOptions);
            }
            else {
                return this._compilerOptions;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TsConfig.prototype, "isOutDir", {
        get: function () {
            return !!this.compilerOptions.outDir;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TsConfig.prototype, "outDir", {
        get: function () {
            return this.compilerOptions.outDir || '.';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TsConfig.prototype, "excluded", {
        // this excluded is not useable by our find function.
        // we want our find functions to work correctly with the globs here.
        get: function () {
            return [this.compilerOptions.outDir].concat(this._getBaseExcluded())
                .filter(function (p) { return typeof (p) === 'string'; });
        },
        enumerable: true,
        configurable: true
    });
    TsConfig.prototype._getBaseExcluded = function () {
        if (this._exclude)
            return this._exclude;
        else if (this._prevConfig)
            return this._prevConfig.excluded;
        else
            return [
                'node_modules',
                'bower_components',
                'jspm_packages'
            ];
    };
    Object.defineProperty(TsConfig.prototype, "files", {
        get: function () {
            if (this._files)
                return this._files;
            else if (this._prevConfig)
                return this._prevConfig.files;
            else
                return undefined;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TsConfig.prototype, "include", {
        get: function () {
            if (this._include)
                return this._include;
            else if (this._prevConfig)
                return this._prevConfig.include;
            else
                return undefined;
        },
        enumerable: true,
        configurable: true
    });
    // this is a combination of include / files / and exclude.
    TsConfig.prototype.includedFileSpec = function (useDefaultExclude) {
        if (useDefaultExclude === void 0) { useDefaultExclude = true; }
        var exclude = this.excluded.concat(useDefaultExclude ? this._defaultExclude() : []).map(this._normalizeGlob);
        if (!this.include && !this.files) {
            return {
                include: this._defaultInclude(),
                exclude: exclude
            };
        }
        else {
            return {
                include: (this.include || []).concat(this.files || []),
                exclude: exclude
            };
        }
    };
    TsConfig.prototype._defaultExclude = function () {
        return [
            '**/*.d.ts',
        ];
    };
    TsConfig.prototype._defaultInclude = function () {
        var result = [
            '**/*.ts',
            '**/*.tsx'
        ];
        if (this.compilerOptions.allowJs) {
            result.push('**/*.js', '**/*.jsx');
        }
        return result;
    };
    TsConfig.prototype._normalizeGlob = function (glob) {
        if (glob.match(/\*/))
            return glob;
        else
            return glob + "/**/*";
    };
    TsConfig.prototype.resolveFilePaths = function () {
        var included = this.includedFileSpec();
        return find_1.find(included.include, {
            cwd: this.rootPath,
            exclude: included.exclude,
            fullPath: true
        });
    };
    TsConfig.prototype.resolveJsDtsFilePaths = function () {
        var included = this.includedFileSpec(false);
        return find_1.find([
            '**/*.d.ts',
            '**/*.js'
        ], {
            cwd: this.rootPath,
            exclude: included.exclude,
            fullPath: true
        });
    };
    Object.defineProperty(TsConfig.prototype, "rootPath", {
        get: function () {
            return path.join(this.basePath, this.compilerOptions.rootDir || '.');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TsConfig.prototype, "outPath", {
        get: function () {
            return path.join(this.basePath, this.compilerOptions.outDir || '.');
        },
        enumerable: true,
        configurable: true
    });
    TsConfig.prototype.toOutPath = function (filePath) {
        var relFilePath = path.relative(this.rootPath, filePath);
        return path.join(this.outPath, relFilePath);
    };
    TsConfig.prototype.toOutPaths = function (filePaths) {
        var _this = this;
        return filePaths.map(function (filePath) { return _this.toOutPath(filePath); });
    };
    return TsConfig;
}());
exports.TsConfig = TsConfig;
function findExcludeFromTsConfig(tsConfig) {
    return tsConfig.excluded.map(function (e) { return e + "/**/*"; });
}
exports.findExcludeFromTsConfig = findExcludeFromTsConfig;
function loadConfig(configName, basePath, recursive) {
    if (configName === void 0) { configName = 'tsconfig.json'; }
    if (basePath === void 0) { basePath = process.cwd(); }
    if (recursive === void 0) { recursive = true; }
    return resolveConfigPath(configName, basePath, recursive)
        .then(function (result) {
        var configOptions = readConfigurationFile(result);
        if (configOptions.extends) {
            return loadConfig(configOptions.extends, result.basePath, false)
                .then(function (prevConfig) {
                return new TsConfig(__assign({}, configOptions, { basePath: result.basePath, configName: result.configName, prevConfig: prevConfig }));
            });
        }
        else {
            return new TsConfig(__assign({}, configOptions, { basePath: result.basePath, configName: result.configName }));
        }
    });
}
exports.loadConfig = loadConfig;
function readConfigurationFile(resolvedConfig) {
    var res = ts.readConfigFile(resolvedConfig.configName, function (filePath) { return resolvedConfig.configData; });
    var compilerOptions = jsonToTsCompilerOptions(res.config.compilerOptions);
    return __assign({}, res.config, { compilerOptions: compilerOptions });
}
exports.readConfigurationFile = readConfigurationFile;
function resolveConfigPath(configName, basePath, recursive) {
    if (recursive === void 0) { recursive = true; }
    var fullPath = path.join(basePath, configName);
    return fs.readFileAsync(fullPath, 'utf8')
        .then(function (configData) {
        return {
            basePath: path.dirname(fullPath),
            configName: path.basename(fullPath),
            configData: configData
        };
    })
        .catch(function (e) {
        if (e.code === 'ENOENT') {
            // what do we want to do?
            // determine that the basePath is no longer the rootPath.
            if (isRootPath(basePath) || !recursive) {
                throw e;
            }
            else {
                return resolveConfigPath(configName, path.dirname(basePath));
            }
        }
        else {
            throw e;
        }
    });
}
exports.resolveConfigPath = resolveConfigPath;
function isRootPath(filePath) {
    return path.dirname(filePath) === filePath;
}
//# sourceMappingURL=tsconfig.js.map