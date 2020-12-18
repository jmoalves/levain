import {assert, assertEquals, assertMatch, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from './config.ts';
import Repository from './repository/repository.ts';
import ChainRepository from './repository/chain_repository.ts';
import CacheRepository from './repository/cache_repository.ts';
import {assertStringEndsWith} from './test/more_asserts.ts';

//
// addRepos
//
Deno.test('should add empty string repos', () => {
    const config = new Config([])
    let repos: Set<string> = new Set<string>()

    config.addRepos(repos, [""])

    assertEquals(0, repos.size)
})

Deno.test('should not add empty array repos', () => {
    const config = new Config([])
    let repos: Set<string> = new Set<string>()

    config.addRepos(repos, [])

    assertEquals(0, repos.size)
})

Deno.test('should not add undefined repos', () => {
    const config = new Config([])
    let repos: Set<string> = new Set<string>()

    config.addRepos(repos, undefined)

    assertEquals(0, repos.size)
})
//
// addRepo
//
Deno.test('should not add undefined repo', () => {
    const config = new Config([])
    let repos: Set<string> = new Set<string>()

    config.addRepo(repos, undefined)

    assertEquals(0, repos.size)
})

Deno.test('should not add string "undefined" repo', () => {
    const config = new Config([])
    let repos: Set<string> = new Set<string>()

    config.addRepo(repos, "undefined")

    assertEquals(0, repos.size)
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
    const repoUris = repos.map(it => it.absoluteURI)
    assertEquals(repos.length, 1)
    assertStringEndsWith(repoUris[0], "levain")
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
    assertEquals(repos.length, 2)
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

    assertStringEndsWith(dir, '.levain')
})
Deno.test('should have levainSafeTempDir', () => {
    const config = new Config([])

    const dir = config.levainSafeTempDir

    assertStringEndsWith(dir, path.join('.levain', 'temp'))
})
Deno.test('should have levainBackupDir', () => {
    const config = new Config([])

    const dir = config.levainBackupDir

    assertStringEndsWith(dir, path.join('.levain', 'backup'))
})
Deno.test('should have levainRegistryDir', () => {
    const config = new Config([])

    const dir = config.levainRegistryDir

    assertStringEndsWith(dir, path.join('.levain', 'registry'))
})
Deno.test('should have a registry', () => {
    const config = new Config([])

    const registry = config.levainRegistry

    assertNotEquals(registry, undefined)
})
Deno.test('should have levainCache', () => {
    const config = new Config([])

    const dir = config.levainCacheDir

    assertStringEndsWith(dir, path.join('.levain', 'cache'))
})
