import * as log from "jsr:@std/log";
import {LogLevels} from "jsr:@std/log"
import {LogRecord} from "jsr:@std/log/logger"
import * as path from "jsr:@std/path"

import {existsSync, copySync} from "jsr:@std/fs"

import Config from '../config.ts';
import {MockPackage} from '../package/mock_package.ts';
import FileSystemPackage from '../package/file_system_package.ts';
import Registry from '../repository/registry.ts';
import TestLogger from '../logger/test_logger.ts';
import ActionFactory from '../../action/action_factory.ts';
import Action from '../../action/action.ts';
import MockRepository from '../repository/mock_repository.ts';
import OsUtils from '../os/os_utils.ts';

export default class TestHelper {
    static async setupTestLogger() {
        return await TestLogger.setup();
    }

    static getActionFromFactory(actionName: string): Action {
        const config = TestHelper.getConfig();
        const factory = new ActionFactory();
        return factory.get(actionName, config);
    }

    static getConfig(): Config {
        const myArgs = {};
        return new Config(myArgs);
    }

    static logRecord(
        msg = 'mock logRecord',
        level: typeof LogLevels.INFO = LogLevels.INFO,
    ) {
        return new LogRecord({
            msg,
            args: [],
            level,
            loggerName: 'anyLogger',
        });
    }

    static mockPackage() {
        return new MockPackage();
    }

    static readonly folderThatAlwaysExists = OsUtils.homeDir;
    static readonly folderThatDoesNotExist = 'this-folder-does-not-exist';
    static readonly anotherFolderThatDoesNotExist =
        'another-folder-that-does-not-exist';
    static readonly fileThatDoesNotExist = path.join(
        TestHelper.folderThatAlwaysExists,
        'this-file-does-not-exist.txt',
    );
    static readonly anotherFileThatDoesNotExist = path.join(
        TestHelper.folderThatAlwaysExists,
        'this-file-also-does-not-exist.txt',
    );
    static readonly testdataDir = path.resolve(
        `${OsUtils.projectRootDir}/testdata`,
    );
    static readonly fileThatExists = path.resolve(
        `${TestHelper.testdataDir}/file_utils/can_read_and_write_this_file.txt`,
    );
    static readonly anotherFileThatExists = path.resolve(
        `${TestHelper.testdataDir}/file_utils/file.txt`,
    );
    static readonly validZipFile = path.resolve(
        `${TestHelper.testdataDir}/extract/test.zip`,
    );
    static readonly validZipFileWithoutExtension = path.resolve(
        `${TestHelper.testdataDir}/extract/zip_file_without_extension`,
    );
    static readonly emptyFile = path.resolve(
        OsUtils.projectRootDir,
        'testdata',
        'copyAction',
        'emptyFile.txt',
    );
    static readonly fileWithContent = path.resolve(
        OsUtils.projectRootDir,
        'testdata',
        'copyAction',
        'fileWithContent.txt',
    );

    static getTestPkg(yamlStr: string) {
        return new FileSystemPackage(
            TestHelper.getConfig(),
            'testPackage',
            'baseDir',
            'filePath',
            yamlStr,
        );
    }

    static getTestFilePackage(
        filePath = 'awesomeYaml.levain.yaml',
    ): FileSystemPackage {
        return new FileSystemPackage(
            TestHelper.getConfig(),
            'awesomeYaml',
            'testdata/file_system_repo/testRepo',
            filePath,
            '',
        );
    }

    static async getNewInitedTempRegistry(): Promise<Registry> {
        const registry = this.getNewTempRegistry();
        await registry.init();
        return registry;
    }

    static getNewTempRegistry(): Registry {
        return new Registry(
            TestHelper.getConfig(),
            TestHelper.getNewTempDir(),
        );
    }

    static getNewTempDir(): string {
        const tempDir = Deno.makeTempDirSync({
            prefix: 'levain-test-',
            suffix: '.dir',
        });
        TestHelper.removeOnExit(tempDir);
        return tempDir;
    }

    static getNewTempFile(copyFile?: string): string {
        const fileName = Deno.makeTempFileSync({
            prefix: 'levain-test-',
            suffix: '.file',
        });
        if (copyFile) {
            copySync(copyFile, fileName, { overwrite: true });
        }

        TestHelper.removeOnExit(fileName);

        return fileName;
    }

    private static removeOnExit(pathname: string): void {
        globalThis.addEventListener('unload', () => {
            if (existsSync(pathname)) {
                Deno.removeSync(pathname, { recursive: true });
            }
        });
    }

    static addRandomFilesToDir(dir: string, number: number) {
        for (let i = 0; i < number; i++) {
            Deno.makeTempFileSync({ dir });
        }
    }

    static resolveTestFile(filepath: string): string {
        return path.resolve('testdata', filepath);
    }

    static randomString(size = 32) {
        let outString = '';
        let inOptions = 'abcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < size; i++) {
            outString += inOptions.charAt(
                Math.floor(Math.random() * inOptions.length),
            );
        }

        return outString;
    }

    static remove(path: string) {
        if (existsSync(path)) {
            Deno.removeSync(path, { recursive: true });
        }
    }

    static async getMockRepositoryInitialized(): Promise<MockRepository> {
        const mockRepository = new MockRepository();
        await mockRepository.init();
        return mockRepository;
    }

    static getTestDataPath(aditionalPath = '') {
        const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
        const testDataPath = path.join(__dirname, '../../../testdata');
        return path.resolve(testDataPath, aditionalPath);
    }

    static async logToConsole() {
        await log.setup({
            handlers: {
                console: new log.ConsoleHandler('DEBUG'),
                //
                // file: new log.handlers.FileHandler("WARNING", {
                //     filename: "./log.txt",
                //     // you can change format of output message using any keys in `LogRecord`.
                //     formatter: "{levelName} {msg}",
                // }),
            },

            loggers: {
                // configure default logger available via short-hand methods above.
                default: {
                    level: 'DEBUG',
                    // handlers: ["console", "file"],
                    handlers: ['console'],
                },
            },
        });
    }

    static pathRegExp(strPath: string, options?: RegExpOptions): RegExp {
        let flags: string | undefined = undefined;

        if (options?.ignoreCase) {
            flags = 'i';
        }

        let regExpStr = `${strPath}`
            .replaceAll('\\', '\\\\')
            .replaceAll('/', '\\/');

        return RegExp(regExpStr, flags);
    }
}

export class RegExpOptions {
    ignoreCase?: boolean;
}
