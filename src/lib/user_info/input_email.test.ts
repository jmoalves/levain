import {assertEquals, assertRejects,} from "jsr:@std/assert"

//
// inputAndValidate
//
import {CliffyTestHelper} from "./cliffy_test_helper.ts";
import {InputEmail} from "./input_email.ts";

Deno.test('InputEmail.inputAndValidate should get a login', async () => {
    const myInput = 'john@doe.com'
    const defaultValue = 'default@server.com'
    const expectedValue = myInput
    await verifyInput(myInput, defaultValue, expectedValue)
})

Deno.test('InputEmail.inputAndValidate should accept a default value', async () => {
    const myInput = ''
    const defaultValue = 'xyzDefault@server.com'
    const expectedValue = defaultValue
    await verifyInput(myInput, defaultValue, expectedValue)
})

Deno.test('InputEmail.inputAndValidate should reject an invalid value', () => {
    assertRejects(
        async () => {
            await verifyInput('--invalid-email--', 'defaultValue@server.com', 'doesntMatter')
        },
        Error
    )
})

async function verifyInput(myInput: string, defaultValue: string, expectedValue: string): Promise<void> {
    CliffyTestHelper.inputResponse(myInput)

    const input = await InputEmail.inputAndValidate(defaultValue)
    assertEquals(input, expectedValue)
}
