import {assert, assertEquals} from "jsr:@std/assert";

import MathUtil from "./math_util.ts";

Deno.test('MathUtil should generate a random int', () => {
    const random = MathUtil.randomInt(10)
    assert(random >= 0)
    assert(random <= 10)
    assertEquals(random, Math.ceil(random))
})
Deno.test('MathUtil should generate a random float', () => {
    const random = MathUtil.randomFloat(10)
    assert(random >= 0)
    assert(random <= 10)
})
