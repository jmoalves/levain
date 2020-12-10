import {assert, assertEquals, assertMatch} from "https://deno.land/std/testing/asserts.ts";

import Config from './config.ts';
import Repository from './repository/repository.ts';
import ChainRepository from './repository/chain_repository.ts';
import CacheRepository from './repository/cache_repository.ts';

//
// addRepos
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
//
// addRepo
//
Deno.test('should not add undefined repo', () => {
    const config = new Config([])
    let repos: Repository[] = []

    config.addRepo(repos, undefined)

    assertEquals(0, repos.length)
})

Deno.test('should not add string "undefined" repo', () => {
    const config = new Config([])
    let repos: Repository[] = []

    config.addRepo(repos, "undefined")

    assertEquals(0, repos.length)
})
//
// configRepo
//
Deno.test('should config default repos', () => {
    const config = new Config([])
    const myArgs = {}

    const cacheRepo: Repository = config.configRepo(myArgs, false)

    assert(cacheRepo instanceof CacheRepository)
    const chainRepo = (cacheRepo as CacheRepository).repository
    assert(chainRepo instanceof ChainRepository)
    const repos: Repository[] = (chainRepo as ChainRepository).repositories
    assertEquals(repos.length, 2)
})
Deno.test('should add extra repo', () => {
    const config = new Config([])
    const myArgs = {
        "addRepo": [
            "D:\\git.repo\\bnd-levain-pkg\\scripts\\.."
        ],
    }

    const cacheRepo: Repository = config.configRepo(myArgs, false)

    const chainRepo = (cacheRepo as CacheRepository).repository
    const repos: Repository[] = (chainRepo as ChainRepository).repositories
    assertEquals(repos.length, 3)
})
//
// dirs
//
Deno.test('should have levainHome', () => {
    const config = new Config([])

    const dir = config.levainHome

    assertMatch(dir, /levain$/)
})
Deno.test('should have levainConfigDir', () => {
    const config = new Config([])

    const dir = config.levainConfigDir

    assertMatch(dir, /(?:\/|\\)\.levain$/)

})
Deno.test('should have levainSafeTempDir', () => {
    const config = new Config([])

    const dir = config.levainSafeTempDir

    assertMatch(dir, /(?:\/|\\)\.levain(?:\/|\\)temp$/)
})
Deno.test('should have levainBackupDir', () => {
    const config = new Config([])

    const dir = config.levainBackupDir

    assertMatch(dir, /(?:\/|\\)\.levain(?:\/|\\)backup$/)
})
