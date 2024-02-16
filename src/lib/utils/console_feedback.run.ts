import {assertArrayIncludes, assertEquals} from "https://deno.land/std/assert/mod.ts"

import ConsoleFeedback from './console_feedback.ts'

let f = new ConsoleFeedback()
console.log('Before')
f.start('# Message')
for (let x = 0; x < 10; x++) {
    f.show()
    await new Promise(r => setTimeout(r, 100))
}
f.reset('# Message final')
console.log('After')
