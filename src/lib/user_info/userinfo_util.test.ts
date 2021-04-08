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
    const userInfoUtil = new UserInfoUtil('./credentials_not_found')

    userInfoUtil.load()

    assertEquals(userInfoUtil.userInfo.login, '')
    assertEquals(userInfoUtil.userInfo.email, '')
    assertEquals(userInfoUtil.userInfo.fullName, '')
})
