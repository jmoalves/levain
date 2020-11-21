import {assertEquals} from "https://deno.land/std@0.78.0/testing/asserts.ts";
import Config from "../config.ts";
import NullRepository from "./nullRepository.ts";

Deno.test('should have a name', () => {
    const repo = new NullRepository(new Config([]),)

    assertEquals(repo.name, 'nullRepo')
})