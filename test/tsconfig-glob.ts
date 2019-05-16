import { suite , test } from 'mocha-typescript';
import * as G from '../lib/tsconfig-glob';
import * as path from 'path';
import * as assert from 'assert';
import * as pathUtil from '../lib/path-util';

@suite class TsConfigGlobTest {
    @test canTestAllowTypes() {
        let spec = new G.TsConfigGlob({
            spec: 'lib',
            basePath: path.join(__dirname, '..'),
        });
        assert.deepEqual([
            '.ts',
            '.tsx',
        ], spec.allowTypes())
        assert.equal('{ts,tsx}', spec.globAllowTypeString())
    }

    @test canTestAllowTypesWithAllowJs() {
        let spec = new G.TsConfigGlob({
            spec: 'lib',
            basePath: path.join(__dirname, '..'),
            allowJs: true
        });
        assert.deepEqual([
            '.ts',
            '.tsx',
            '.js',
            '.jsx'
        ], spec.allowTypes())
        assert.equal('{ts,tsx,js,jsx}', spec.globAllowTypeString())
    }

    @test canHandleDirectoryIncludeGlob() {
        // 'lib' => 'lib/**/*.{ts,tsx}
        let spec = new G.TsConfigGlob({
            spec: 'lib',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal('lib/**/*.{ts,tsx}', spec.toIncludeGlob())
        assert.equal(pathUtil.join(__dirname, '..', 'lib/**/*.{ts,tsx}'), spec.toIncludeGlob(true))

    }

    @test canHandleRecursiveIncludeGlob() {
        // **/node_modules/*
        let spec = new G.TsConfigGlob({
            spec: '**/node_modules/*',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal('**/node_modules/*.{ts,tsx}', spec.toIncludeGlob())
        assert.equal(pathUtil.join(__dirname, '..', '**/node_modules/*.{ts,tsx}'), spec.toIncludeGlob(true))
    }

    @test canHandleDirectoryExcludeGlob() {
        // **/node_modules/*
        let spec = new G.TsConfigGlob({
            spec: 'node_modules',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal('node_modules/**/*', spec.toExcludeGlob())
        assert.equal(pathUtil.join(__dirname, '..', 'node_modules/**/*'), spec.toExcludeGlob(true))
    }

    @test canHandleRecursiveExcludeGlob() {
        // **/node_modules/*
        let spec = new G.TsConfigGlob({
            spec: '**/node_modules/*',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal('**/node_modules/*', spec.toExcludeGlob())
        assert.equal(pathUtil.join(__dirname, '..', '**/node_modules/*'), spec.toExcludeGlob(true))
    }

    @test canHandleFileglob() {
        // lib/**/*.d.ts
        let spec = new G.TsConfigGlob({
            spec: '**/*.d.ts',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal('**/*.d.ts', spec.toIncludeGlob())
        assert.equal('**/*.d.ts', spec.toExcludeGlob())
        assert.equal(true, spec.hasExtension('.d.ts'))
    }


}