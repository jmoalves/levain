import {assertEquals,} from "https://deno.land/std@0.78.0/testing/asserts.ts";
import ListCommand from "./listCommand.ts";
import MemoryLogger from "../lib/logger/memoryLogger.ts";
import Config from "../lib/config.ts";
import NullRepository from "../lib/repository/nullRepository.ts";

Deno.test('Should list nullRepo', () => {
    const config = new Config([]);
    config.repository = new NullRepository(config)
    const list = new ListCommand(config)
    const logger = new MemoryLogger()
    list.logger = logger

    list.execute()

    assertEquals(logger.getInfo(), [
        "list - listing repositories and packages",
        "repository found: nullRepo",
        "no packages found"
    ])
})

//
// Deno.test('List should list packages available in a repo', () => {
//     const config = new Config([]);
//     const mockRepo = new MockRepository('mockRepo', ['aPackage', 'anotherPackage'])
//     config.repository = mockRepo
//
//     const list = new ListCommand(config)
//     const logger = new MemoryLogger()
//     list.logger = logger
//     list.execute()
//
//     assertEquals(logger.getInfo(), [
//         "list - 1 repository: nullRepo",
//         "repo: mockRepo, 2 package(s)",
//         "package: aPackage",
//         "package: anotherPackage"
//     ])
// })