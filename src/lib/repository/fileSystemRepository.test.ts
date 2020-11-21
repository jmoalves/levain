import {assertEquals} from "https://deno.land/std@0.78.0/testing/asserts.ts";
import Config from "../config.ts";
import FileSystemRepository from "./fileSystemRepository.ts";

Deno.test('should have a name', () => {
    const repo = new FileSystemRepository(new Config([]), '.')

    assertEquals(repo.name, 'fileSystemRepo for .')
})