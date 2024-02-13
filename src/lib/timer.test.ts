import {assert, assertNotEquals} from "https://deno.land/std/assert/mod.ts";

import {Timer} from "./timer.ts";

Deno.test('should measure elapsed time', () => {
    const timer = new Timer()

    const firstMeasure: number = timer.measure()
    assert(firstMeasure > 0, "firstMeasure should be greater then 0")

    assert(timer.measure() > firstMeasure, "secondMeasure should be greater then first measure. Great Scott! Do you have a DeLorean?!?")
})

Deno.test('should humanize measures', () => {
    const timer = new Timer()

    assertNotEquals(timer.humanize(), undefined)
})