import TestHelper from '../lib/test/test_helper.ts';
import ActionFactory from './action_factory.ts';
import {assert,} from "https://deno.land/std/testing/asserts.ts";
import CopyAction from './copy.ts';
import * as path from "https://deno.land/std/path/mod.ts";
import {assertFileDoesNotExist, assertFileSizeAprox} from '../lib/test/more_asserts.ts';

const emptyFile = path.join('testdata', 'copyAction', 'emptyFile.txt')
const fileWithContent = path.resolve('testdata', 'copyAction', 'fileWithContent.txt')

Deno.test('CopyAction should be obtainable with action factory', () => {
    const action = getCopyAction();

    assert(action instanceof CopyAction)
})
Deno.test('CopyAction should replace file', async () => {
    const tempDir = TestHelper.getNewTempDir()
    const dstFile = path.resolve(tempDir, 'newFile.txt')
    Deno.copyFileSync(emptyFile, dstFile)
    assertFileSizeAprox(dstFile, 0)

    const action = getCopyAction()
    await action.execute(TestHelper.mockPackage(), [
        fileWithContent,
        dstFile,
    ])

    assertFileSizeAprox(dstFile, 576)
})
Deno.test('CopyAction --ifNotExists should copy a new file', async () => {
    const tempDir = TestHelper.getNewTempDir()
    const dstFile = path.resolve(tempDir, 'newFile.txt')
    assertFileDoesNotExist(dstFile)

    const action = getCopyAction()
    await action.execute(TestHelper.mockPackage(), [
        '--ifNotExists',
        fileWithContent,
        dstFile,
    ])

    assertFileSizeAprox(dstFile, 576)
})
Deno.test('CopyAction --ifNotExists should not copy file if it already exists', async () => {
    const tempDir = TestHelper.getNewTempDir()
    const dstFile = path.resolve(tempDir, 'newFile.txt')
    Deno.copyFileSync(emptyFile, dstFile)
    assertFileSizeAprox(dstFile, 0)

    const action = getCopyAction()
    await action.execute(TestHelper.mockPackage(), [
        '--ifNotExists',
        fileWithContent,
        dstFile,
    ])

    assertFileSizeAprox(dstFile, 0)
})


function getCopyAction() {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("copy", config)
    return action;
}
