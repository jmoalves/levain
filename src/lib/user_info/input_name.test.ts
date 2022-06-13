import {assertEquals, assertThrowsAsync} from "https://deno.land/std/testing/asserts.ts";

//
// inputAndValidate
//
import {CliffyTestHelper} from "./cliffy_test_helper.ts";
import {InputFullName} from "./input_name.ts";

Deno.test('InputFullName.inputAndValidate should get a name', async () => {
    CliffyTestHelper.inputResponse('Will Smith')

    const input = await InputFullName.inputAndValidate('John Doe')

    assertEquals(input, 'Will Smith')
})
Deno.test('InputFullName.inputAndValidate should accept a default value', async () => {
    CliffyTestHelper.inputResponse('')

    const input = await InputFullName.inputAndValidate('Groku')

    assertEquals(input, 'Groku')
})
Deno.test('InputFullName.inputAndValidate should reject an invalid value', async () => {
    CliffyTestHelper.inputResponse('not-a-name!')

    assertThrowsAsync(
        async () => {
            await InputFullName.inputAndValidate('Shazam')
        },
        Error,
        ' ✘ Only valid characters, please'
    )
})
