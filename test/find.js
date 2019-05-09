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
var find_1 = require("../lib/find");
var path = require("path");
var FindTest = /** @class */ (function () {
    function FindTest() {
    }
    // how do I want to test find?
    FindTest.prototype.canExcludeFiles = function () {
        return find_1.find('**/*.ts', {
            cwd: path.join(__dirname, '..'),
            exclude: [
                'node_modules/**/*'
            ]
        })
            .then(function (filePaths) {
            filePaths.forEach(function (filePath) {
                assert.ok(filePath.indexOf('node_modules') === -1);
            });
        });
    };
    __decorate([
        mocha_typescript_1.test,
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], FindTest.prototype, "canExcludeFiles", null);
    FindTest = __decorate([
        mocha_typescript_1.suite
    ], FindTest);
    return FindTest;
}());
//# sourceMappingURL=find.js.map