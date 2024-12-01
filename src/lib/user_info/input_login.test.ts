import {assertEquals, assertRejects} from "jsr:@std/assert";

//
// askUser
//
import {InputLogin} from "./input_login.ts";
import {CliffyTestHelper} from "./cliffy_test_helper.ts";

Deno.test('InputLogin.askUser should get a login', async () => {
    CliffyTestHelper.inputResponse('rfwal')

    const input = await InputLogin.askUser('afo')

    assertEquals(input, 'rfwal')
})
Deno.test('InputLogin.askUser should accept a default value', async () => {
    CliffyTestHelper.inputResponse('')

    const input = await InputLogin.askUser('ppppp')

    assertEquals(input, 'ppppp')
})
Deno.test('InputEmail.askUser should reject an invalid value', async () => {
    CliffyTestHelper.inputResponse('--invalid-email--')

    assertRejects(
        async () => {
            await InputLogin.askUser('defaultValue@server.com')
        },
        Error
    )
})
