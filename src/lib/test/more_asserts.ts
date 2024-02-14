import {assert, assertArrayIncludes, assertEquals} from "https://deno.land/std/assert/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import DirUtils from "../fs/dir_utils.ts";
import {FileUtils} from '../fs/file_utils.ts';
import OsUtils from '../os/os_utils.ts';

export function assertArrayIncludesElements<T>(array: T[], elements: T[]) {
    let notFound: T[] = []
    elements.forEach(element => {
        if (!array.includes(element)) {
            notFound.push(element)
        }
    })
    assertEquals(0, notFound.length, `Expected to find elements ${notFound} in ${array}`)
}

export function assertArrayDoesNotInclude<T>(array: T[], elements: T[]) {
    let found: T[] = []
    elements.forEach(element => {
        if (array.includes(element)) {
            found.push(element)
        }
    })
    assertEquals(0, found.length, `Expected to find elements ${found} in ${array}`)
}

export function assertStringEndsWith(
    text: string,
    ending: string,
    msg: string = `Expected "${text}" to end with "${ending}"`,
) {
    assert(text.endsWith(ending), msg)
}

export function assertArrayEndsWith<T>(array: T[], expectedEnd: T[]) {
    const arrayLength = array.length
    const endLength = expectedEnd.length
    const ending = array.slice(arrayLength - endLength)
    assertEquals(
        ending,
        expectedEnd,
        // `expected ${JSON.stringify(array)} to end with ${JSON.stringify(expectedEnd)}`
    )
}

export function assertFind<T>(
    array: Array<T>,
    func: (it: T) => boolean,
    msg: string = 'Could\'t find expected element',
) {
    assert(array.find(func), msg)
}

export function assertNotFind<T>(
    array: Array<T>,
    func: (it: T) => boolean,
    msg: string = 'Shouldn\'t be able to find element',
) {
    assertEquals(array.find(func), undefined, msg)
}

export function assertArrayEqualsInAnyOrder<T>(
    actual: Array<T>,
    expected: Array<T>,
) {
    const missedExpectations = expected.filter(it => !actual.includes(it))
    const missedActualElements = actual.filter(it => !expected.includes(it))

    assertEquals(
        actual.sort().toString(),
        expected.sort().toString(),
    )

    assert(
        (missedExpectations.length === 0) && (missedActualElements.length === 0),
        `expected ${JSON.stringify(actual)} to have the same elements as ${JSON.stringify(expected)}`,
    )
}

export function assertFolderIncludes(folder: string, expectedFiles: string[]) {
    let separator = path.SEPARATOR
    const dstRelativeFiles = DirUtils.listFileNames(folder)
        .map(it => path.resolve(it))
    // .map(it => it.toString().replace(dstWithSlash, ''))
    const expectedRelativeFiles = expectedFiles
        .map(it => path.resolve(folder, it))
    // .map(it => it.toString().replace(dstWithSlash, ''))

    assertArrayIncludes(
        dstRelativeFiles,
        expectedRelativeFiles,
    )
}

export function assertFolderDoesNotInclude(folder: string, expectedFiles: string[]) {
    let separator = path.SEPARATOR
    const dstRelativeFiles = DirUtils.listFileNames(folder)
        .map(it => path.resolve(it))
    // .map(it => it.toString().replace(dstWithSlash, ''))
    const expectedRelativeFiles = expectedFiles
        .map(it => path.resolve(folder, it))
    // .map(it => it.toString().replace(dstWithSlash, ''))

    assertArrayDoesNotInclude(
        dstRelativeFiles,
        expectedRelativeFiles,
    )
}

export function assertDirCount(dir: string, expectedCount: number, msg?: string | undefined) {
    assertEquals(DirUtils.count(dir), expectedCount, msg)
}

export function assertDirCountGreaterOrEqualTo(dir: string, minCount: number, msg?: string | undefined) {
    assertGreaterOrEqualTo(DirUtils.count(dir), minCount, msg)
}

export function assertFileSizeAprox(path: string, expectedSize: number) {
    const size = FileUtils.getSize(path)
    assertNumberEquals(size, expectedSize, 0.10)
}

export function assertPathEndsWith(path: string, expectedEnd: string) {
    const normalizedPath = DirUtils.normalizePath(path)
    const normalizedEnd = DirUtils.normalizePath(expectedEnd)
    assert(normalizedPath.endsWith(normalizedEnd), `Expected path ${normalizedPath} to end with ${normalizedEnd}`)
}

export function assertPathDoesNotExist(path: string) {
    assert(!existsSync(path), `Path ${path} should not exist`)
}

export function assertPathExists(path: string) {
    assert(existsSync(path), `Path ${path} should exist`);
}

export function assertNumberEquals(current: number, expected: number, tolerance: number = 0.10) {
    if (expected === 0) {
        assertEquals(current, expected)
        return
    }

    const diff = (current - expected) / expected
    if (Math.abs(diff) > tolerance) {
        assertEquals(current, expected)
    }
}

export function assertGreaterThan(
    number: number,
    otherNumber: number,
    msg: string = `Expected ${number} to be greater than ${otherNumber}`
) {
    assert(number > otherNumber, msg)
}

export function assertGreaterOrEqualTo(
    number: number,
    otherNumber: number,
    msg: string = `Expected ${number} to be greater or equal to ${otherNumber}`
) {
    assert(number >= otherNumber, msg)
}
