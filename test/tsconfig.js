"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var mocha_typescript_1 = require("mocha-typescript");
var assert = require("assert");
var tsConfig = require("../lib/tsconfig");
var ts = require("typescript");
var config;
var TsConfigTest = /** @class */ (function () {
    function TsConfigTest() {
    }
    TsConfigTest.prototype.canLoadConfig = function () {
        var expectedOptions = {
            target: ts.ScriptTarget.ES5,
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            lib: [
                'lib.es5.d.ts',
                'lib.es2015.promise.d.ts',
                'lib.es6.d.ts',
                'lib.dom.d.ts',
            ],
            noImplicitAny: true,
            outDir: '.',
            rootDir: '.',
            sourceMap: true,
            strict: true,
        };
        // this loads the config of this package.
        // it also tests resolving from a non-root directory.
        return tsConfig.loadConfig()
            .then(function (c) {
            config = c;
            assert.deepEqual(config.compilerOptions, expectedOptions);
        });
    };
    TsConfigTest.prototype.canResolveFilePaths = function () {
        return config.resolveFilePaths()
            .then(function (filePaths) {
            console.log(filePaths);
            console.log(config.toOutPaths(filePaths));
        });
    };
    __decorate([
        mocha_typescript_1.test,
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TsConfigTest.prototype, "canLoadConfig", null);
    __decorate([
        mocha_typescript_1.test,
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TsConfigTest.prototype, "canResolveFilePaths", null);
    TsConfigTest = __decorate([
        mocha_typescript_1.suite
    ], TsConfigTest);
    return TsConfigTest;
}());
//# sourceMappingURL=tsconfig.js.map