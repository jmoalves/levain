import {
    assert,
    assertEquals,
    assertMatch,
    assertNotEquals,
    assertNotMatch,
    assertThrows
} from "https://deno.land/std/testing/asserts.ts";
import {existsSync} from "https://deno.land/std/fs/exists.ts";
import * as fs from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as log from "https://deno.land/std/log/mod.ts";

import OsUtils from "./os_utils.ts";
import {assertGreaterThan, assertPathExists} from "../test/more_asserts.ts";
import TestHelper from "../test/test_helper.ts";
import DirUtils from "../fs/dir_utils.ts";

const currentFileDir = path.dirname(import.meta.url)
const referenceFile = `${currentFileDir}/../../testdata/os_utils/testOsUtils.txt`

Deno.test('OsUtils should know where is the temp folder', () => {
    assertNotEquals(OsUtils.tempDir, undefined);
    assert(existsSync(OsUtils.tempDir));
})

Deno.test({
    name: 'OsUtils should know where is the home folder',
    // only: true,
    fn: () => {
        log.info(`OsUtils.homeDir ${OsUtils.homeDir}`,)
        assert(OsUtils.homeDir)
        assert(existsSync(OsUtils.homeDir))
    }
})

if (OsUtils.isWindows()) {
    Deno.test({
        name: 'OsUtils.desktopDir should know the desktop folder',
        fn: () => {
            const desktopDir = OsUtils.desktopDir;
            assert(desktopDir)
            assert(existsSync(desktopDir), `Could not find desktop folder ${desktopDir}`)
        }
    })

    Deno.test({
        name: 'OsUtils.startMenuDir should know the start menu folder',
        fn: () => {
            const startMenuDir = OsUtils.startMenuDir;
            assert(startMenuDir)
            assert(existsSync(startMenuDir), `Could not find start menu folder ${startMenuDir}`)
        }
    })

    Deno.test({
        name: 'OsUtils.startupDir should know the startup folder',
        fn: () => {
            const startupDir = OsUtils.startupDir;
            assert(startupDir)
            assert(existsSync(startupDir), `Could not find start menu folder ${startupDir}`)
        }
    })
}

Deno.test('OsUtils should know the users login', () => {
    assertNotEquals(OsUtils.login, undefined)
})

Deno.test('OsUtils should know if we are running in Windows', () => {
    const os = Deno.build.os
    const shouldBeWindows = (os === 'windows')
    assertEquals(OsUtils.isWindows(), shouldBeWindows)
})

Deno.test('OsUtils should know if we are running in Posix', () => {
    const os: string = Deno.build.os
    const shouldBePosix = ['linux', 'darwin'].includes(os)
    assertEquals(OsUtils.isPosix(), shouldBePosix)
})

Deno.test('OsUtils should know if we are running in macOS', () => {
    const os = Deno.build.os
    const shouldBeMacOs = (os === 'darwin')
    assertEquals(OsUtils.isMacOs(), shouldBeMacOs)
})

Deno.test('OsUtils should know if we are running in Linux', () => {
    const os = Deno.build.os
    const shouldBeLinux = (os === 'linux')
    assertEquals(OsUtils.isLinux(), shouldBeLinux)
})

if (OsUtils.isWindows()) {
    Deno.test('Deno.symlinkSync throws unnecessary permission error. Use it in OsUtils.createShortcut when fixed.', () => {
        const tempDir = 'c:\\temp\\'
        fs.ensureDirSync(tempDir)
        const filePath = 'c:\\temp\\arquivo.txt'
        fs.ensureFileSync(filePath)
        const linkPath = 'c:\\temp\\arquivo.txt.lnk';
        OsUtils.removeFile(linkPath)

        assertThrows(
            () => {
                fs.ensureSymlinkSync(filePath, linkPath)
            },
            Error,
            // '(os error 5)',
            '(os error 1314)',
        )
    })

    Deno.test('OsUtils.createShortcut should create a shortcut/symlink to a file', async () => {
        // Given that I have an empty dir
        const tempDir = TestHelper.getNewTempDir()
        // And a file
        const aFile = TestHelper.getNewTempFile()
        const aFileName = path.basename(aFile)

        // When I create a symlink to the file in the empty dir
        await OsUtils.createShortcut(aFile, tempDir)

        // Then the new symlink should exist
        assertPathExists(path.join(tempDir, `${aFileName}.lnk`))
    })

    Deno.test({
        name: 'OsUtils.addToDesktop should create a shortcut to a file',
        // only: true,
        fn: async () => {
            // Given that I have a file
            const aFile = referenceFile
            const aFileName = path.basename(aFile)
            // And the file isn´t in the Desktop
            const dir = OsUtils.desktopDir
            const shortcut = path.resolve(dir, `${aFileName}.lnk`)
            OsUtils.removeFile(shortcut)

            // When I add the file to the Desktop
            await OsUtils.addToDesktop(aFile)

            // Then the new symlink should exist
            assertPathExists(shortcut)
        }
    })

    Deno.test({
        name: 'OsUtils.addToStartup should create a shortcut to a file',
        // only: true,
        fn: async () => {
            // Given that I have a file
            const aFile = referenceFile
            const aFileName = path.basename(aFile)
            // And the file isn´t in the startup folder
            const dir = OsUtils.startupDir
            const shortcut = path.resolve(dir, `${aFileName}.lnk`)
            OsUtils.removeFile(shortcut)

            // When I add the file to the Startup folder
            await OsUtils.addToStartup(aFile)

            // Then the new symlink should exist
            assertPathExists(shortcut)
        }
    })

    Deno.test({
        name: 'OsUtils.addToStartMenu should create a shortcut to a file',
        // only: true,
        fn: async () => {
            // Given that I have a file
            const aFile = referenceFile
            const aFileName = path.basename(aFile)
            // And the file isn´t in the start menu
            const dir = OsUtils.startMenuDir
            const shortcut = path.resolve(dir, `${aFileName}.lnk`)
            OsUtils.removeFile(shortcut)

            // When I add the file to the Start Menu
            await OsUtils.addToStartMenu(aFile)

            // Then the new symlink should exist
            assertPathExists(shortcut)
        }
    })

    Deno.test({
        name: 'OsUtils.addToStartMenu should create a shortcut to a file in a group',
        // only: true,
        fn: async () => {
            // Given that I have a file
            const aFile = referenceFile
            const aFileName = path.basename(aFile)
            // And a group
            const aGroup = 'dev-env-test'
            // And the file isn´t in the start menu
            const dir = OsUtils.startMenuDir
            const shortcut = path.resolve(dir, aGroup, `${aFileName}.lnk`)
            OsUtils.removeFile(shortcut)

            // When I add the file to the Start Menu
            await OsUtils.addToStartMenu(aFile, aGroup)

            // Then the new symlink should exist
            assertPathExists(shortcut)
        }

    })
}

Deno.test('OsUtils.resolvePath should resolve a string', () => {
    // Given an unresolved string path
    const unresolvedPath = 'abc/123'
    // When I resolve the path
    const resolvedPath = OsUtils.resolvePath(unresolvedPath)
    // It should end with my path
    assertMatch(resolvedPath, /abc[\/\\]+123/)
})

Deno.test('OsUtils.resolvePath should resolve a string array', () => {
    // Given an unresolved string array path
    const unresolvedPath = ['abc', '123']
    // When I resolve the path
    const resolvedPath = OsUtils.resolvePath(unresolvedPath)
    // It should end with my path
    assertMatch(resolvedPath, /abc[\/\\]+123/)
})

if (OsUtils.isWindows()) {
    Deno.test({
        name: 'OsUtils.getUserPath should get path',
        async fn() {
            const path = await OsUtils.getUserPath()
            assertGreaterThan(path?.length, 5)
        }
    })

    Deno.test({
        name: 'OsUtils.sanitizePathString should remove invalid chars',
        async fn() {
            const path = 'C:\\src\\dev-env\\levain";"C:\\Program Files (x86)\\Common Files\\Oracle\\Java\\javapath"'
            const sanitizedPath = OsUtils.sanitizePathString(path)
            assertEquals(sanitizedPath, 'C:\\src\\dev-env\\levain;C:\\Program Files (x86)\\Common Files\\Oracle\\Java\\javapath')
        }
    })

    Deno.test({
        name: 'OsUtils.sanitizePathArray should remove invalid chars',
        async fn() {
            const pathArray = ['%USERPROFILE%\\AppData\\Local\\Microsoft\\WindowsApps"', '"C:\\Program Files\\Docker\\Docker\\resources\\bin"']
            const sanitizedPathArray = OsUtils.sanitizePathArray(pathArray)
            assertEquals(sanitizedPathArray, ['%USERPROFILE%\\AppData\\Local\\Microsoft\\WindowsApps', 'C:\\Program Files\\Docker\\Docker\\resources\\bin'])
        }
    })

    Deno.test('OsUtils.addPathPermanent should set path permanently', async () => {

        //Given the users folder is not in the path
        const folder = TestHelper.folderThatAlwaysExists;
        await OsUtils.removePathPermanent(folder);
        assert(!await OsUtils.isInUserPath(folder), `Shouldn't have the folder ${folder} in path - ${await OsUtils.getUserPath()}`);

        //When I add to the path
        await OsUtils.addPathPermanent(folder);

        //Then it should be there
        assert(await OsUtils.isInUserPath(folder), `Should have the folder ${folder} in path - ${await OsUtils.getUserPath()}`);
    })
}
//
// runAndLog
//
const getCurrentDirCommand = OsUtils.isWindows()
    ? 'cmd /u /c echo %cd%'
    : 'pwd'
Deno.test('OsUtils.runAndLog should not insert unicode zeros in stdout', async () => {
    const stdout = await OsUtils.runAndLog(getCurrentDirCommand)
    assertNotMatch(stdout, /\u0000/)
})
Deno.test('OsUtils.runAndLog should execute and return stdout', async () => {
    const stdout = await OsUtils.runAndLog(getCurrentDirCommand)

    const normalizedPath = DirUtils.normalizePath(stdout)
    assertMatch(normalizedPath, /[\\\/]+levain/)
})
Deno.test({
    name: 'OsUtils.runAndLog should accept a workDir',
    async fn() {
        const stdout = await OsUtils.runAndLog(getCurrentDirCommand, TestHelper.getTestDataPath())
        const pathInOutput = stdout.replaceAll(/[\r\n]/gm, '')
        const normalizedPath = DirUtils.normalizePath(pathInOutput)
        assertMatch(normalizedPath, /[\\\/]+testdata/)
    },
    // only: true,
})
