import {assert, assertRejects} from "https://deno.land/std/assert/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import TestHelper from '../../lib/test/test_helper.ts';
import MavenCopyAction from "./maven_copy.ts";
import ActionFactory from "../action_factory.ts";
import {assertFileEmpty, assertFileNotEmpty} from "../../lib/test/more_asserts.ts";
import {FileUtils} from "../../lib/fs/file_utils.ts";

Deno.test('MavenCopyAction should be obtainable with action factory', () => {
    const action = getMavenCopyAction();
    assert(action instanceof MavenCopyAction);
});

Deno.test('MavenCopyAction should throw exception when arguments are not provided', async () => {
    const action = getMavenCopyAction();
    await assertRejects(
        async () => {
            await action.execute(TestHelper.mockPackage(), []);
        },
        Error,
        'Invalid arguments.\n  Usage: mavenCopy [coordinates] [destination]\n  Example: mavenCopy mavenCopy.cmd br.gov.bndes.iew.iew-for-liberty:iew-userregistry-liberty-feature:1.7.1:esa c:\\temp',
    );
});

Deno.test('MavenCopyAction should fetch and copy Maven artifact', async () => {
    if (Deno.env.get("M2_HOME")) {
        const tempDir = TestHelper.getNewTempDir();
        const dstFile = path.resolve(tempDir, 'kotlin-stdlib-2.1.21.jar');
        const coordinates = 'org.jetbrains.kotlin:kotlin-stdlib:2.1.21:jar';

        const action = getMavenCopyAction();
        await action.execute(TestHelper.mockPackage(), [
            coordinates,
            tempDir,
        ]);

        const stat = await Deno.stat(dstFile);
        assert(stat.isFile);
        await assertFileNotEmpty(dstFile)
    }
});

Deno.test('MavenCopyAction should overwrite existing artifact', async () => {
    if (Deno.env.get("M2_HOME")) {
        const tempDir = TestHelper.getNewTempDir();
        const dstFile = path.resolve(tempDir, 'kotlin-stdlib-2.1.21.jar');
        await FileUtils.createEmptyFile(dstFile)
        await assertFileEmpty(dstFile)

        const coordinates = 'org.jetbrains.kotlin:kotlin-stdlib:2.1.21:jar';

        const action = getMavenCopyAction();
        await action.execute(TestHelper.mockPackage(), [
            coordinates,
            tempDir,
        ]);

        const stat = await Deno.stat(dstFile);
        assert(stat.isFile);
        await assertFileNotEmpty(dstFile)
    }
});

function getMavenCopyAction() {
    const config = TestHelper.getConfig();
    const factory = new ActionFactory();
    return factory.get('mavenCopy', config);
}
