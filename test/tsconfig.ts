import { suite , test } from 'mocha-typescript';
import * as assert from 'assert';
import * as tsConfig from '../lib/tsconfig';
import * as ts from 'typescript';
import * as path from 'path';

let config : tsConfig.TsConfig;

@suite class TsConfigTest {
    @test canLoadConfig() {
        let expectedOptions : ts.CompilerOptions = {
            target: ts.ScriptTarget.ES5,
            declaration: true,
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            lib: [
                'lib.es5.d.ts',
                'lib.es2015.promise.d.ts',
                'lib.es6.d.ts',
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
                assert.deepEqual(config.compilerOptions, expectedOptions)
                assert.equal(path.join(__dirname, '..'), config.rootDir)
                assert.equal(path.join(__dirname, '..', 'dist'), config.outDir)
            })
    }

    @test canGetInclude() {
        assert.deepEqual([
            'bin',
            'lib'
        ], config.include)
    }

    // we need a converesion between tsconfig include / exclude 
    // to glob spec
    // as well as to FSWatcher spec (which appears to be different)
    @test canLoadIncludeFileSpec() {
        assert.deepEqual({
            include: [
                'bin/**/*.{ts,tsx}',
                'lib/**/*.{ts,tsx}'
            ],
            exclude: [
                'dist/**/*',
                'node_modules/**/*',
                'bower_components/**/*',
                'jspm_packages/**/*',
                '.git/**/*',
                '**/*.d.ts'
            ]
        }, config.includedFileSpec())
    }

    @test canResolveFilePaths() {
        return config.resolveFilePaths()
            .then((filePaths) => {
                console.log(`****** resolveFilePaths`, filePaths)
                assert.ok(filePaths.length > 0, 'Resolve should return files')
                filePaths.forEach((filePath) => {
                    let outPath = config.toOutPath(filePath)
                    assert.ok(outPath.indexOf('dist') !== -1)
                    assert.ok(filePath.indexOf('test') === -1, `test/ not in include: ${filePath}`)
                })
            })
    }

    @test canTestIncludedJsDtsFileSpec() {
        let fileSpec = config.includedJsDTsFileSpec();
        console.log(`****** js/dts/fileSpec`, fileSpec)
        assert.deepEqual({
            include: [
                'bin/**/*.{js,d.ts}',
                'lib/**/*.{js,d.ts}'
            ],
            exclude: [
                'dist/**/*',
                'node_modules/**/*',
                'bower_components/**/*',
                'jspm_packages/**/*',
                '.git/**/*'
            ]
        }, fileSpec);
    }

    @test canResolveJsDTsPaths() {
        return config.resolveJsDtsFilePaths()
            .then((filePaths) => {
                console.log(`****** resolveJsDtsFilePaths`, filePaths)
                assert.deepEqual(filePaths, [
                    path.join(__dirname, '..', 'bin', 'tsc.js')
                ])
            })
    }

    @test canTestExcludedPaths() {
        let excluded = config.excluded;
        console.log(`******** canTestExcluded`, excluded)
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