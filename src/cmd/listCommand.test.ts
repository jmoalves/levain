import {assertEquals,} from "https://deno.land/std@0.78.0/testing/asserts.ts";
import ListCommand from "./listCommand.ts";
import MemoryLogger from "../lib/logger/memoryLogger.ts";
import Config from "../lib/config.ts";
import NullRepository from "../lib/repository/nullRepository.ts";
import MockRepository from "../lib/repository/mockRepository.ts";

Deno.test('should list nullRepo', () => {
    const config = new Config([]);
    config.repository = new NullRepository(config)
    const list = new ListCommand(config)
    const logger = new MemoryLogger()
    list.logger = logger

    list.execute()

    assertEquals(logger.getInfo(), [
        "list - listing repositories and packages",
        "repository nullRepo:",
        "  no packages found",
    ])
})

Deno.test('should list packages available in a repo', () => {
    const config = new Config([]);
    const mockRepo = new MockRepository()
    config.repository = mockRepo
    const list = new ListCommand(config)
    const logger = new MemoryLogger()
    list.logger = logger

    list.execute()

    assertEquals(logger.getInfo(), [
        "list - listing repositories and packages",
        "repository mockRepo:",
        "  2 packages found:",
        "    package: aPackage 1.0.1",
        "    package: anotherPackage 0.1.2"
    ])
})