import {assertEquals, assertRejects} from "jsr:@std/assert";

//
// askUser
//
import {CliffyTestHelper} from "./cliffy_test_helper.ts";
import {InputFullName} from "./input_name.ts";

Deno.test('InputFullName.askUser should get a name', async () => {
    CliffyTestHelper.inputResponse('Will Smith')

    const input = await InputFullName.askUser('John Doe')

    assertEquals(input, 'Will Smith')
})
Deno.test('InputFullName.askUser should accept a default value', async () => {
    CliffyTestHelper.inputResponse('')

    const input = await InputFullName.askUser('Groku')

    assertEquals(input, 'Groku')
})
Deno.test('InputFullName.askUser should reject an invalid value', async () => {
    CliffyTestHelper.inputResponse('not-a-name!')

    assertRejects(
        async () => {
            await InputFullName.askUser('Shazam')
        },
        Error
    )
})
