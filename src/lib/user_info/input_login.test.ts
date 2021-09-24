import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

//
// askFullName
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
