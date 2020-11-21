import {assertEquals} from "https://deno.land/std@0.78.0/testing/asserts.ts";
import CacheRepository from "./cache.ts";
import Config from "../config.ts";
import MockRepository from "./mockRepository.ts";

Deno.test('should have a name', () => {
    const repo = new CacheRepository(new Config([]), new MockRepository())

    assertEquals(repo.name, 'cacheRepo for mockRepo')
})