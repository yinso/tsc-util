import { suite , test } from 'mocha-typescript';
import * as G from '../lib/tsconfig-glob';
import * as path from 'path';
import * as assert from 'assert';
import * as vpath from '../lib/vpath';

describe('TestConfigRegExpTest', function() {
    let basePath = new vpath.PathObject(path.join(__dirname, '..')).toVirtualPath();
    let basePathRegExp = '^' + basePath.replace(/\//g, '\\/');

    let tests = [
        {
            spec: 'lib', // this is a directory.
            expected: /\/lib/,
            fullPathExpected: new RegExp(basePathRegExp + '\\/lib'),
            matches: [
                path.join(__dirname, '..', 'lib')
            ]
        },
        {
            spec: 'lib/*',
            expected: /\/lib\/([^\/]*)?/,
            fullPathExpected: new RegExp(basePathRegExp + '\\/lib\\/([^\\/]*)?'),
            matches: [
                path.join(__dirname, '..', 'lib', 'path-util.ts'),
                path.join(__dirname, '..', 'lib', 'tsc.js'),
            ]
        },
        {
            spec: '**/node_modules',
            expected: /\/(.*)?\/node_modules/,
            fullPathExpected: new RegExp(basePathRegExp + '\\/(.*)?\\/node_modules'),
            matches: [
                path.join(__dirname, '..', 'node_modules'),
                path.join(__dirname, '..', 'node_modules', 'test'),
            ]
        },
        {
            spec: 'lib/*.ts',
            expected: /\/lib\/([^\/]*)?\.ts/,
            fullPathExpected: new RegExp(basePathRegExp + '\\/lib\\/([^\\/]*)?\\.ts'),
            matches: [
                path.join(__dirname, '..', 'lib', 'tsc.ts'),
            ]
        }
    ]

    tests.forEach((test) => {
        it(`canTestReExp ${test.spec} => ${test.expected}`, function () {
            let glob = new G.TsConfigGlob({
                spec: test.spec,
                basePath: path.join(__dirname, '..')
            });
            assert.deepEqual(glob.toRegExp(), test.expected);
            assert.deepEqual(glob.toRegExp(true), test.fullPathExpected);
            test.matches.forEach((filePath) => {
                assert.ok(glob.match(filePath), `fail to match ${glob.toRegExp()}: ${filePath}`)
            })
        })
    })
})

@suite class TsConfigGlobTest {

    @test canTestAllowTypes() {
        let spec = new G.TsConfigGlob({
            spec: 'lib',
            basePath: path.join(__dirname, '..'),
        });
        assert.deepEqual(spec.allowTypes, [
            '.ts',
            '.tsx',
        ])
        assert.equal(spec.globAllowTypeString(), '{ts,tsx}')
    }

    @test canTestAllowTypesWithAllowJs() {
        let spec = new G.TsConfigGlob({
            spec: 'lib',
            basePath: path.join(__dirname, '..'),
            allowJs: true
        });
        assert.deepEqual(spec.allowTypes, [
            '.ts',
            '.tsx',
            '.js',
            '.jsx'
        ])
        assert.equal( spec.globAllowTypeString(), '{ts,tsx,js,jsx}')
    }

    @test canHandleDirectoryIncludeGlob() {
        // 'lib' => 'lib/**/*.{ts,tsx}
        let spec = new G.TsConfigGlob({
            spec: 'lib',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal(spec.toIncludeGlob(), 'lib/**/*.{ts,tsx}',)
        assert.equal(spec.toIncludeGlob(true), new vpath.PathObject(__dirname).join('..', 'lib/**/*.{ts,tsx}').toVirtualPath())
    }

    @test canHandleRecursiveIncludeGlob() {
        // **/node_modules/*
        let spec = new G.TsConfigGlob({
            spec: '**/node_modules/*',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal(spec.toIncludeGlob(), '**/node_modules/*.{ts,tsx}')
        assert.equal(spec.toIncludeGlob(true), new vpath.PathObject(__dirname).join('..', '**/node_modules/*.{ts,tsx}').toVirtualPath())
    }

    @test canHandleDirectoryExcludeGlob() {
        // **/node_modules/*
        let spec = new G.TsConfigGlob({
            spec: 'node_modules',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal(spec.toExcludeGlob(), 'node_modules/**/*')
        assert.equal(spec.toExcludeGlob(true), new vpath.PathObject(__dirname).join('..', 'node_modules/**/*').toVirtualPath())
    }

    @test canHandleRecursiveExcludeGlob() {
        // **/node_modules/*
        let spec = new G.TsConfigGlob({
            spec: '**/node_modules/*',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal('**/node_modules/*', spec.toExcludeGlob())
        assert.equal(spec.toExcludeGlob(true), new vpath.PathObject(__dirname).join('..', '**/node_modules/*').toVirtualPath())
    }

    @test canHandleFileglob() {
        // lib/**/*.d.ts
        let spec = new G.TsConfigGlob({
            spec: '**/*.d.ts',
            basePath: path.join(__dirname, '..'),
        });
        assert.equal(spec.toIncludeGlob(), '**/*.d.ts')
        assert.equal(spec.toExcludeGlob(), '**/*.d.ts')
        assert.equal(spec.hasExtension('.d.ts'), true)
    }
}
