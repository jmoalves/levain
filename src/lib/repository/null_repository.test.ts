import {assertEquals} from "https://deno.land/std/assert/mod.ts";

import Config from "../config.ts";

import NullRepository from "./null_repository.ts";

const repo = new NullRepository(new Config([]),)

Deno.test('nullRepo should have a name', () => {
    assertEquals(repo.name, 'nullRepo')
})

Deno.test('nullRepo should not have packages', () => {
    assertEquals(repo.listPackages(), [])
})
