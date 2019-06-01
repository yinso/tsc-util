import { suite , test } from 'mocha-typescript';
import * as assert from 'assert';
import * as tsConfig from '../lib/tsconfig';
import * as ts from 'typescript';
import * as path from 'path';
import * as tsFinder from '../lib/tsconfig-finder';
import * as jsWatcher from '../lib/js-watcher';

let config : tsConfig.TsConfig;
let finder : tsFinder.TsConfigFinder;
let watcherSpec : jsWatcher.JsWatcherFileSpec;

@suite class TsConfigTest {
    @test canLoadConfig() {
        let expectedOptions : ts.CompilerOptions = {
            target: ts.ScriptTarget.ES5,
            declaration: true,
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            noEmitOnError: true,
            lib: [
                'lib.es5.d.ts',
                'lib.es2015.promise.d.ts',
                'lib.es2015.d.ts',
                'lib.dom.d.ts',
            ],
            noImplicitAny: true,
            outDir: 'dist',
            rootDir: '.',
            sourceMap: true,
            strict: true,
        }
        // this loads the config of this package.
        // it also tests resolving from a non-root directory.
        return tsConfig.loadConfig()
            .then((c) => {
                config = c;
                assert.equal(path.join(__dirname, '..'), c.basePath)
                assert.equal('tsconfig.json', config.configName);
                assert.equal(path.join(__dirname, '..', 'tsconfig.json'), config.configFilePath)
                assert.deepEqual(config.compilerOptions, expectedOptions)
                assert.equal(path.join(__dirname, '..'), config.rootDir)
                assert.equal(path.join(__dirname, '..', 'dist'), config.outDir)
            })
    }

    @test canGetInclude() {
        assert.deepEqual([
            'bin',
            'lib',
            'test',
        ], config.include)
    }

    // we need a converesion between tsconfig include / exclude 
    // to glob spec
    // as well as to FSWatcher spec (which appears to be different)
    @test canLoadIncludeFileSpec() {
        finder = new tsFinder.TsConfigFinder({
            config,
        })
        assert.deepEqual({
            include: [
                'bin/**/*.{ts,tsx}',
                'lib/**/*.{ts,tsx}',
                'test/**/*.{ts,tsx}',
            ],
            exclude: [
                'dist/**/*',
                'node_modules/**/*',
                'bower_components/**/*',
                'jspm_packages/**/*',
                '.git/**/*',
                '**/*.d.ts'
            ],
            rootPath: path.join(__dirname, '..')
        }, finder.includedFileSpec())
    }

    @test canResolveFilePaths() {
        return finder.resolveFilePaths()
            .then((filePaths) => {
                assert.ok(filePaths.length > 0, 'Resolve should return files')
                filePaths.forEach((filePath) => {
                    let outPath = config.toOutPath(filePath)
                    assert.ok(outPath.indexOf('dist') !== -1)
                })
            })
    }

    @test canMapMovedModuleRequireSpec() {
        let testCases = [
            {
                // this is the source-map-support pattern. remove dist/
                modulePath: './bin/tsc.js',
                spec : '../dist/lib/index',
                expected: '../lib/index',
            },
            {
                // this is the "ts-node" pattern, copy as is.
                modulePath: './bin/tsc.js',
                spec: '../lib/test',
                expected: '../lib/test'
            },
        ]
        testCases.forEach((testCase) => {
            assert.equal(config.moveModuleSpec(testCase.modulePath, testCase.spec), testCase.expected);
        })
    }


    @test canResolveJsWatcherFilePaths() {
        return finder.resolveJsWatcherFilePaths()
            .then((filePaths) => {
                assert.deepEqual(filePaths, [
                    path.join(__dirname, '..', 'bin', 'tsc.js'),
                    path.join(__dirname, '..', 'lib', 'test.d.ts'),
                    path.join(__dirname, '..', 'lib', 'test.js'),
                ])
            })
    }

    @test canTestExcludedPaths() {
        let excluded = config.excluded;
    }

    @test canTestExcludedDirs() {
        assert.deepEqual([
            path.join(__dirname, '..', 'dist'),
            path.join(__dirname, '..', 'node_modules'),
            path.join(__dirname, '..', 'bower_components'),
            path.join(__dirname, '..', 'jspm_packages'),
            path.join(__dirname, '..', '.git')
        ], config.excludedDirs())
    }

    @test canTestIgnoredPath() {
        let ignoredPath = path.join(__dirname, '..', 'node_modules');
        assert.ok(config.isIgnoredPath(ignoredPath))
    }
}