import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import Config from './config.ts';
import Repository from './repository/repository.ts';

//
// Add repos
//
Deno.test('should add empty string repos', () => {
    const config = new Config([])
    let repos: Repository[] = []

    config.addRepos(repos, [""])

    assertEquals(0, repos.length)
})

Deno.test('should not add empty array repos', () => {
    const config = new Config([])
    let repos: Repository[] = []

    config.addRepos(repos, [])

    assertEquals(0, repos.length)
})

Deno.test('should not add undefined repos', () => {
    const config = new Config([])
    let repos: Repository[] = []

    config.addRepos(repos, undefined)

    assertEquals(0, repos.length)
})
