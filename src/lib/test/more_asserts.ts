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

export function assertStringEndsWith(text: string, ending: string) {
    assert(text.endsWith(ending), `Expected "${text}" to end with "${ending}"`)
}
