import {assert, assertEquals, assertMatch, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from './config.ts';
import {assertStringEndsWith} from './test/more_asserts.ts';
import TestHelper from "./test/test_helper.ts";

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
Deno.test('should set levainBackupDir', () => {
    const config = new Config([])

    const newDir = TestHelper.getNewTempDir();
    config.levainBackupDir = newDir

    assertEquals(config.levainBackupDir, newDir)
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

    assertEquals(dir, path.join(config.levainHome, '.levainCache'))
})
Deno.test('should set levainCache', () => {
    const config = new Config([])

    const newDir = TestHelper.getNewTempDir();
    config.levainCacheDir = newDir

    assertEquals(config.levainCacheDir, newDir)
})
Deno.test('should config levainCache with cli args', () => {
    const config = new Config({levainCache: 'cache/'})

    assertEquals(config.levainCacheDir, 'cache/')
})