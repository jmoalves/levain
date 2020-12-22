import {assert, assertArrayIncludes, assertEquals} from "https://deno.land/std/testing/asserts.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import DirUtils from "../dir_utils.ts";
import OsUtils from '../os_utils.ts';
import FileUtils from '../file_utils.ts';

export function assertArrayIncludesElements<T>(array: T[], elements: T[]) {
    let notFound: T[] = []
    elements.forEach(element => {
        if (!array.includes(element)) {
            notFound.push(element)
        }
    })
    assertEquals(0, notFound.length, `Expected to find elements ${notFound} in ${array}`)
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
        `expected ${JSON.stringify(array)} to end with ${JSON.stringify(expectedEnd)}`
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

export function assertArrayContainsInAnyOrder<T>(
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

export function assertFolderIncludes(dst: string, expectedFiles: string[]) {
    let sep = path.sep
    if (OsUtils.isWindows()) {
        if (sep === "\\\\") throw "fixed in Deno, please remove this code block"
        sep = '\\\\'
    }
    const dstWithSlash = dst.endsWith(sep) ? dst : dst + sep
    const dstRelativeFiles = DirUtils.listFileNames(dst)
        .map(it => path.resolve(it))
    // .map(it => it.toString().replace(dstWithSlash, ''))
    const expectedRelativeFiles = expectedFiles
        .map(it => path.resolve(dst, it))
    // .map(it => it.toString().replace(dstWithSlash, ''))

    assertArrayIncludes(
        dstRelativeFiles,
        expectedRelativeFiles,
    )
}

export function assertDirCount(dir: string, expectedCount: number, msg?: string | undefined) {
    assertEquals(DirUtils.count(dir), expectedCount, msg)
}

export function assertFileSizeAprox(path: string, expectedSize: number) {
    const size = FileUtils.getSize(path)

    assertNumberEquals(size, expectedSize, 0.10)
}

export function assertFileDoesNotExist(filePath: string) {
    assert(!existsSync(filePath), `File ${filePath} should not exist`)
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