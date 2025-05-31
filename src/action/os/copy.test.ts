import * as path from 'https://deno.land/std/path/mod.ts';
import {assert} from 'https://deno.land/std/assert/mod.ts';

import TestHelper from '../../lib/test/test_helper.ts';
import {assertFileSizeAprox, assertPathDoesNotExist,} from '../../lib/test/more_asserts.ts';

import ActionFactory from '../action_factory.ts';
import CopyAction from './copy.ts';

Deno.test('CopyAction should be obtainable with action factory', () => {
    const action = getCopyAction();

    assert(action instanceof CopyAction);
});
Deno.test('CopyAction should replace file', async () => {
    const tempDir = TestHelper.getNewTempDir();
    const dstFile = path.resolve(tempDir, 'newFile.txt');
    Deno.copyFileSync(TestHelper.emptyFile, dstFile);
    assertFileSizeAprox(dstFile, 0);

    const action = getCopyAction();
    await action.execute(TestHelper.mockPackage(), [
        TestHelper.fileWithContent,
        dstFile,
    ]);

    assertFileSizeAprox(dstFile, 576);
});
Deno.test('CopyAction --ifNotExists should copy a new file', async () => {
    const tempDir = TestHelper.getNewTempDir();
    const dstFile = path.resolve(tempDir, 'newFile.txt');
    assertPathDoesNotExist(dstFile);

    const action = getCopyAction();
    await action.execute(TestHelper.mockPackage(), [
        '--ifNotExists',
        TestHelper.fileWithContent,
        dstFile,
    ]);

    assertFileSizeAprox(dstFile, 576);
});
Deno.test('CopyAction --ifNotExists should not copy file if it already exists', async () => {
    const tempDir = TestHelper.getNewTempDir();
    const dstFile = path.resolve(tempDir, 'newFile.txt');
    Deno.copyFileSync(TestHelper.emptyFile, dstFile);
    assertFileSizeAprox(dstFile, 0);

    const action = getCopyAction();
    await action.execute(TestHelper.mockPackage(), [
        '--ifNotExists',
        TestHelper.fileWithContent,
        dstFile,
    ]);

    assertFileSizeAprox(dstFile, 0);
});

function getCopyAction() {
    const config = TestHelper.getConfig();
    const factory = new ActionFactory();
    return factory.get('copy', config);
}
