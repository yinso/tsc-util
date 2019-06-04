import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { find } from '../lib/util';
import * as path from 'path';

@suite class FindTest {
    // how do I want to test find?
    @test canExcludeFiles() {
        return find('**/*.ts', {
            cwd: path.join(__dirname, '..'),
            exclude: [
                '**/node_modules/**/*'
            ]
        })
            .then((filePaths) => {
                filePaths.forEach((filePath) => {
                    assert.ok(filePath.indexOf('node_modules') === -1)
                })
            })
    }

}