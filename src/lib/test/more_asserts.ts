import {assert, assertEquals} from "https://deno.land/std/testing/asserts.ts";

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

    assert(
        (missedExpectations.length === 0) && (missedActualElements.length === 0),
        `expected ${JSON.stringify(actual)} to have the same elements as ${JSON.stringify(expected)}`,
    )
}
