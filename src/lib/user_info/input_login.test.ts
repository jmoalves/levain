import {assertEquals, assertRejects} from "https://deno.land/std/assert/mod.ts";

//
// inputAndValidate
//
import {InputLogin} from "./input_login.ts";
import {CliffyTestHelper} from "./cliffy_test_helper.ts";

Deno.test('InputLogin.inputAndValidate should get a login', async () => {
    CliffyTestHelper.inputResponse('rfwal')

    const input = await InputLogin.inputAndValidate('afo')

    assertEquals(input, 'rfwal')
})
Deno.test('InputLogin.inputAndValidate should accept a default value', async () => {
    CliffyTestHelper.inputResponse('')

    const input = await InputLogin.inputAndValidate('ppppp')

    assertEquals(input, 'ppppp')
})
Deno.test('InputEmail.inputAndValidate should reject an invalid value', async () => {
    CliffyTestHelper.inputResponse('--invalid-email--')

    assertRejects(
        async () => {
            await InputLogin.inputAndValidate('defaultValue@server.com')
        },
        Error,
        ' ✘ Please inform a valid LOGIN'
    )
})
