import {assertEquals,} from "https://deno.land/std/testing/asserts.ts";
import ListCommand from "./list_command.ts";
import Config from "../lib/config.ts";
import NullRepository from "../lib/repository/null_repository.ts";
import MockRepository from "../lib/repository/mock_repository.ts";
import TestLogger from "../lib/logger/test_logger.ts";


const setupLog = [
    "INFO DEFAULT levainHome=/Users/rafaelwalter/levain",
    "INFO LOAD /Users/rafaelwalter/levain/.levain/config.json",
    "INFO ",
    'INFO === Config: \n{\n   "levainHome": "/Users/rafaelwalter/levain"\n}',
]

Deno.test('should list nullRepo', async () => {

    const logger = await TestLogger.setup()

    const config = new Config([]);
    config.repository = new NullRepository(config)
    const list = new ListCommand(config)

    list.execute()

    assertEquals(
        logger.messages,
        setupLog.concat(
            [
                "INFO ",
                "INFO ==================================",
                "INFO list ",
                "INFO Repository: nullRepo:",
                "INFO   no packages found",
            ]
        )
    )

})

Deno.test('should list packages available in a repo', async () => {

    const logger = await TestLogger.setup()
    const config = new Config([]);
    config.repository = new MockRepository()
    const list = new ListCommand(config)

    list.execute()

    assertEquals(
        logger.messages,
        setupLog.concat(
            [
                "INFO ",
                "INFO ==================================",
                "INFO list ",
                "INFO Repository: mockRepo:",
                "INFO   2 packages found:",
                "INFO ",
                "INFO === Packages",
                "INFO   aPackage                       1.0.1      => /mock/aPackage-1.0.1.yml",
                "INFO   anotherPackage                 0.1.2      => /mock/anotherPackage-0.1.2.yml",
            ]
        )
    )
})

Deno.test('should list packages that match a search string', async () => {
    const searchString = 'another'
    const logger = await TestLogger.setup()
    const config = new Config([]);
    config.repository = new MockRepository()
    const list = new ListCommand(config)


    list.execute([searchString])

    assertEquals(
        logger.messages,
        setupLog.concat(
            [
                "INFO ",
                "INFO ==================================",
                "INFO list another",
                "INFO Repository: mockRepo:",
                "INFO   1 package found:",
                "INFO ",
                "INFO === Packages",
                "INFO   anotherPackage                 0.1.2      => /mock/anotherPackage-0.1.2.yml",
            ]
        )
    )
})

