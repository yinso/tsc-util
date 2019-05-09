import { suite , test } from 'mocha-typescript';
import * as assert from 'assert';
import * as tsConfig from '../lib/tsconfig';
import * as ts from 'typescript';

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
            })
    }

    @test canResolveFilePaths() {
        return config.resolveFilePaths()
            .then((filePaths) => {
                console.log(filePaths)
                console.log(config.toOutPaths(filePaths))
            })
    }

}