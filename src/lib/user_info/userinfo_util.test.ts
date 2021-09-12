import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import {assertStringEndsWith} from "../test/more_asserts.ts";

import UserInfoUtil from "./userinfo_util.ts";

Deno.test('UserInfoUtil should use user_info file in $HOME/credentials_jdoe.yaml', () => {
    const userInfoUtil = new UserInfoUtil()
    assertStringEndsWith(userInfoUtil.userinfoFileUri, `/.levain.yaml`)
})
Deno.test('UserInfoUtil should load user info', async () => {
    const userInfoUtil = new UserInfoUtil('./testData/home/credentials_jdoe.yaml')

    await userInfoUtil.load()

    assertEquals(userInfoUtil.userInfo.login, 'jdoe')
    assertEquals(userInfoUtil.userInfo.email, 'john.doe@organization.org')
    assertEquals(userInfoUtil.userInfo.fullName, 'John Doe')
})
Deno.test('UserInfoUtil should work when user info is not found', async () => {
    const userInfoUtil = new UserInfoUtil('./this_file_does_not_exist')

    await userInfoUtil.load()

    assertEquals(userInfoUtil.userInfo.login, '')
    assertEquals(userInfoUtil.userInfo.email, '')
    assertEquals(userInfoUtil.userInfo.fullName, '')
})
//
// askFullName
//
// Deno.test('UserInfoUtil.askFullName should get full name', async () => {
//     const userInfoUtil = new UserInfoUtil()
//     const config = TestHelper.getConfig()
//     CliffyTestHelper.inputResponse('Walter Elias Disney')
//
//     await userInfoUtil.askFullName(config)
//
//     assertEquals(userInfoUtil.userInfo.fullName, 'Walter Elias Disney')
//     assertEquals(config.fullname, 'Walter Elias Disney')
// })
// Deno.test('UserInfoUtil.inputFullName should have a default value', async () => {
//     const userInfoUtil = new UserInfoUtil()
//     const defaultFullName = 'Steve Jobs'
//     CliffyTestHelper.inputResponse("")
//
//     const input = await userInfoUtil.inputFullName(defaultFullName)
//
//     assertEquals(input, defaultFullName)
// })
