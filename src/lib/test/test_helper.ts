import * as log from "https://deno.land/std/log/mod.ts";
import {LogRecord, LogLevels} from "https://deno.land/std/log/mod.ts"
import * as path from "https://deno.land/std/path/mod.ts"

import {existsSync, copySync} from "https://deno.land/std/fs/mod.ts"

import Config from "../config.ts";
import {MockPackage} from "../package/mock_package.ts";
import FileSystemPackage from '../package/file_system_package.ts';
import Registry from '../repository/registry.ts';
import TestLogger from "../logger/test_logger.ts";
import ActionFactory from "../../action/action_factory.ts";
import Action from "../../action/action.ts";
import {envChain} from "../utils/utils.ts";
import MockRepository from "../repository/mock_repository.ts";

export default class TestHelper {

    static async setupTestLogger() {
        return await TestLogger.setup()
    }

    static getActionFromFactory(actionName: string): Action {
        const config = TestHelper.getConfig()
        const factory = new ActionFactory()
        return factory.get(actionName, config)
    }

    static getConfig(): Config {
        const myArgs = {};
        return new Config(myArgs)
    }

    static logRecord(
        msg = 'mock logRecord',
        level: (typeof LogLevels.INFO) = LogLevels.INFO,
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

    static readonly folderThatAlwaysExists = TestHelper.homeDir();
    static readonly folderThatDoesNotExist = 'this-folder-does-not-exist';
    static readonly anotherFolderThatDoesNotExist = 'another-folder-that-does-not-exist';
    static readonly fileThatDoesNotExist = path.join(TestHelper.folderThatAlwaysExists, 'this-file-does-not-exist.txt');
    static readonly anotherFileThatDoesNotExist = path.join(TestHelper.folderThatAlwaysExists, 'this-file-also-does-not-exist.txt');
    static readonly fileThatExists = path.resolve('testdata/file_utils/can_read_and_write_this_file.txt');
    static readonly anotherFileThatExists = path.resolve('testdata/file_utils/file.txt');
    static readonly validZipFile = path.resolve('testdata/extract/test.zip')

    // FIXME Use OsUtils.homeDir
    static homeDir(): string {
        const homeEnvStrings = ['HOME', 'USERPROFILE'];
        const folderFromEnv = envChain(...homeEnvStrings);
        if (!folderFromEnv) {
            throw `Home folder not found. Looked for env vars ${homeEnvStrings.join()}`
        }
        return path.resolve(folderFromEnv)
    }

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
            'testdata/file_system_repo/testRepo',
            filePath,
            '',
        )
    }

    static async getNewInitedTempRegistry(): Promise<Registry> {
        const registry = this.getNewTempRegistry()
        await registry.init()
        return registry
    }

    static getNewTempRegistry(): Registry {
        return new Registry(
            TestHelper.getConfig(),
            TestHelper.getNewTempDir()
        )
    }

    static getNewTempDir(): string {
        const tempDir = Deno.makeTempDirSync({prefix: 'levain-test-', suffix: ".dir"});
        console.debug(`getNewTempDir ${tempDir}`)

        TestHelper.removeOnExit(tempDir)

        return tempDir
    }

    static getNewTempFile(copyFile?: string): string {
        const fileName = Deno.makeTempFileSync({prefix: 'levain-test-', suffix: ".file"})
        if (copyFile) {
            copySync(copyFile, fileName, {overwrite: true})
        }

        TestHelper.removeOnExit(fileName)

        return fileName
    }

    private static removeOnExit(pathname: string): void {
        globalThis.addEventListener("unload", () => {
            if (existsSync(pathname)) {
                console.debug(`TMP - Removing ${pathname}`)
                Deno.removeSync(pathname, {recursive: true})
            }
        })
    }

    static addRandomFilesToDir(dir: string, number: number) {
        for (let i = 0; i < number; i++) {
            Deno.makeTempFileSync({dir})
        }
    }

    static resolveTestFile(filepath: string): string {
        return path.resolve('testdata', filepath);
    }

    static randomString(size = 32) {
        let outString = '';
        let inOptions = 'abcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < size; i++) {
            outString += inOptions.charAt(Math.floor(Math.random() * inOptions.length));
        }

        return outString;
    }

    static remove(path: string) {
        if (existsSync(path)) {
            Deno.removeSync(path, {recursive: true})
        }
    }

    static async getMockRepositoryInitialized(): Promise<MockRepository> {
        const mockRepository = new MockRepository()
        await mockRepository.init()
        return mockRepository;
    }

    static getTestDataPath(aditionalPath = '') {
        const __dirname = path.dirname(path.fromFileUrl(import.meta.url))
        const testDataPath = path.join(__dirname, '../../../testdata')
        return path.resolve(testDataPath, aditionalPath)
    }

    static async logToConsole() {
        await log.setup({
            handlers: {
                console: new log.ConsoleHandler("DEBUG"),
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
                    level: "DEBUG",
                    // handlers: ["console", "file"],
                    handlers: ["console"],
                },
            },
        });
    }
}
