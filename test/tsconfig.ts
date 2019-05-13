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
        }
        // this loads the config of this package.
        // it also tests resolving from a non-root directory.
        return tsConfig.loadConfig()
            .then((c) => {
                config = c;
                assert.deepEqual(config.compilerOptions, expectedOptions)
                assert.equal(path.join(__dirname, '..'), config.rootDir)
                assert.equal(path.join(__dirname, '..'), config.outDir)
            })
    }


    @test canResolveFilePaths() {
        return config.resolveFilePaths()
            .then((filePaths) => {
                let outFilePaths = config.toOutPaths(filePaths);
                console.log(`******** resolvedFilePaths`, filePaths)
                assert.deepEqual(filePaths, outFilePaths)
            })
    }

    @test canTestExcludedPaths() {
        let excluded = config.excluded;
        console.log(`******** canTestExcluded`, excluded)
        
    }

    @test canTestExcludedDirs() {
        assert.deepEqual([
            path.join(__dirname, '..', 'node_modules')
        ], config.excludedDirs())
    }

    @test canTestIgnoredPath() {
        let ignoredPath = path.join(__dirname, '..', 'node_modules');
        assert.ok(config.isIgnoredPath(ignoredPath))
    }
}