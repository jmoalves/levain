import {assertEquals,} from "https://deno.land/std@0.78.0/testing/asserts.ts";
import ListCommand from "./list_command.ts";
import MemoryLogger from "../lib/logger/memoryLogger.ts";
import Config from "../lib/config.ts";
import NullRepository from "../lib/repository/null_repository.ts";
import Mock_repository from "../lib/repository/mock_repository.ts";

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
    const mockRepo = new Mock_repository()
    config.repository = mockRepo
    const list = new ListCommand(config)
    const logger = new MemoryLogger()
    list.logger = logger

    list.execute()

    assertEquals(logger.getInfo(), [
        "list - listing repositories and packages",
        "repository mockRepo:",
        "  2 packages found:",
        "    package: aPackage 1.0.1 (/mock/aPackage-1.0.1.yml)",
        "    package: anotherPackage 0.1.2 (/mock/anotherPackage-0.1.2.yml)"
    ])
})