import {LogRecord} from "https://deno.land/std/log/logger.ts"
import {LogLevels} from "https://deno.land/std/log/levels.ts"
import * as path from "https://deno.land/std/path/mod.ts"
import {copySync, exists} from "https://deno.land/std/fs/mod.ts"
import Config from "../config.ts";
import {MockPackage} from "../package/mock_package.ts";
import OsUtils from '../os_utils.ts';
import FileSystemPackage from '../package/file_system_package.ts';
import Registry from '../repository/registry.ts';
import TestLogger from "../logger/test_logger.ts";

export default class TestHelper {

    static getConfig(): Config {
        const myArgs = {};
        return new Config(myArgs)
    };

    static logRecord(
        msg: string = 'mock logRecord',
        level: LogLevels = LogLevels.INFO,
    ) {
        return new LogRecord({
            msg,
            args: [],
            level,
            loggerName: 'anyLogger',
        })
    }

    static mockPackage() {
        return new MockPackage()
    }

    static readonly folderThatAlwaysExists = OsUtils.homeDir;
    static readonly folderThatDoesNotExist = 'this-folder-does-not-exist';
    static readonly anotherFolderThatDoesNotExist = 'another-folder-that-does-not-exist';
    static readonly fileThatDoesNotExist = path.join(TestHelper.folderThatAlwaysExists, 'this-file-does-not-exist.txt');
    static readonly validZipFile = path.resolve('testdata/extract/test.zip')

    static getTestPkg(yamlStr: string) {
        return new FileSystemPackage(
            TestHelper.getConfig(),
            'testPackage',
            'baseDir',
            'filePath',
            yamlStr,
        )
    }

    static getTestFilePackage(filePath = 'awesomeYaml.levain.yaml'): FileSystemPackage {
        return new FileSystemPackage(
            TestHelper.getConfig(),
            'awesomeYaml',
            './testdata/testRepo',
            filePath,
            '',
        )
    }

    static getNewTempRegistry(): Registry {
        return new Registry(
            TestHelper.getConfig(),
            Deno.makeTempDirSync()
        );
    }

    static getNewTempDir(): string {
        return Deno.makeTempDirSync()
    }

    static getNewTempFile(originalFile?: string): string {
        const fileName = Deno.makeTempFileSync()
        if (originalFile) {
            copySync(originalFile, fileName, {overwrite: true})
        }
        return fileName
    }

    static addRandomFilesToDir(dir: string, number: number) {
        for (let i = 0; i < number; i++) {
            Deno.makeTempFileSync({dir})
        }
    }

    static resolveTestFile(filepath: string): string {
        return path.resolve('testdata', filepath);
    }

    static async setupTestLogger() {
        return await TestLogger.setup()
    }

    static randomString(size: number = 32) {
        let outString: string = '';
        let inOptions: string = 'abcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < size; i++) {
            outString += inOptions.charAt(Math.floor(Math.random() * inOptions.length));
        }

        return outString;
    }

    static remove(path: string) {
        if (exists(path)) {
            Deno.removeSync(path, {recursive: true})
        }
    }
}
