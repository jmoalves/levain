import {LogRecord} from "https://deno.land/std/log/logger.ts"
import {LogLevels} from "https://deno.land/std/log/levels.ts"
import * as path from "https://deno.land/std/path/mod.ts"
import Config from "../config.ts";
import {MockPackage} from "../package/mock_package.ts";
import OsUtils from '../os_utils.ts';
import FileSystemPackage from '../package/file_system_package.ts';
import Registry from '../repository/registry.ts';

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
    static readonly validZipFile = '../testdata/extract/test.zip'

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
}
