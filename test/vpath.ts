import { suite , test } from 'mocha-typescript';
import * as P from '../lib/vpath';
import * as path from 'path';
import * as assert from 'assert';
import * as os from 'os';

let filePath = path.join(__dirname, '..')
let p : P.PathObject;

@suite class VPathTest {
    @test canNormalizePath() {
        p = new P.PathObject(filePath)
        assert.equal(p.toOsPath(), filePath)
        assert.equal(p.toString(), os.platform() === 'win32' ? filePath.replace(/\\/g, '/') : filePath)
    }

    @test canJoinPaths() {
        let p1 = p.join('lib', 'vpath');
        assert.equal(p1.toOsPath(), path.join(filePath, 'lib', 'vpath'))
    }

    @test canTestIsAbsolute() {
        assert.ok(p.isAbsolute());
    }

    @test isRelative() {
        assert.ok(new P.PathObject('./a-relative-path'))
    }
}