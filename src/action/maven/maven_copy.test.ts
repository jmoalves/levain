import {assert, assertRejects} from "https://deno.land/std/assert/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import TestHelper from '../../lib/test/test_helper.ts';
import MavenCopyAction from "./maven_copy.ts";
import ActionFactory from "../action_factory.ts";

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
        'Invalid arguments. Usage: mavenCopy [coordinates] [destination]',
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
    }
});

function getMavenCopyAction() {
    const config = TestHelper.getConfig();
    const factory = new ActionFactory();
    return factory.get('mavenCopy', config);
}
