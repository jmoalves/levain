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