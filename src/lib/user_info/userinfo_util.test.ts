import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import {assertStringEndsWith} from "../test/more_asserts.ts";

import UserInfoUtil from "./userinfo_util.ts";
import TestHelper from "../test/test_helper.ts";
import Config from "../config.ts";
import {CliffyTestHelper} from "./cliffy_test_helper.ts";
import {UserInfo} from "./user_info.ts";

Deno.test('UserInfoUtil should use user_info file in $HOME/credentials_jdoe.yaml', () => {
    const userInfoUtil = new UserInfoUtil()
    assertStringEndsWith(userInfoUtil.userinfoFileUri, `/.levain.yaml`)
})
//
// load
//
Deno.test('UserInfoUtil should load user info', async () => {
    const userinfoFileUri = TestHelper.getTestDataPath('home/credentials_jdoe.yaml')
    const userInfoUtil = new UserInfoUtil(userinfoFileUri)

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
// askUserInfo
//
Deno.test('UserInfoUtil.askUserInfo should return userInfo', async () => {
    const tempUserInfoFile = TestHelper.getNewTempFile()
    const userInfoUtil = new UserInfoUtil(tempUserInfoFile)
    const config = new Config()
    const defaultUserInfo = new UserInfo()
    defaultUserInfo.fullName = 'John Doe'
    userInfoUtil.userInfo = defaultUserInfo

    const args = {
        'ask-fullname': true,
    }
    CliffyTestHelper.inputResponse('Walter Elias Disney')

    const userInfo = await userInfoUtil.askUserInfo(config, args)

    assertEquals(userInfo.fullName, 'Walter Elias Disney')
})
//
// askFullName
//
Deno.test('UserInfoUtil.askFullName should get full name', async () => {
    const userInfoUtil = new UserInfoUtil()
    const config = TestHelper.getConfig()
    const name = 'Walter Elias Disney';
    CliffyTestHelper.inputResponse(name)

    await userInfoUtil.askFullName(config)

    assertEquals(userInfoUtil.userInfo.fullName, name)
    assertEquals(config.fullname, name)
})
Deno.test('UserInfoUtil.inputFullName should have a default value', async () => {
    const userInfoUtil = new UserInfoUtil()
    const defaultFullName = 'Steve Jobs'
    CliffyTestHelper.inputResponse("")
    const config = TestHelper.getConfig()

    const input = await userInfoUtil.askFullName(config, defaultFullName)

    assertEquals(input, defaultFullName)
})
//
// askLogin
//
Deno.test('UserInfoUtil.askLogin should get askLogin login', async () => {
    const userInfoUtil = new UserInfoUtil()
    const config = TestHelper.getConfig()
    const login = 'rfwal';
    CliffyTestHelper.inputResponse(login)

    await userInfoUtil.askLogin(config)

    assertEquals(userInfoUtil.userInfo.login, login)
    assertEquals(config.login, login)
})
Deno.test('UserInfoUtil.askLogin should have a default value', async () => {
    const userInfoUtil = new UserInfoUtil()
    const defaultLogin = 'jdoe'
    CliffyTestHelper.inputResponse("")
    const config = TestHelper.getConfig()

    const input = await userInfoUtil.askLogin(config, defaultLogin)

    assertEquals(input, defaultLogin)
})
//
// askEmail
//
Deno.test('UserInfoUtil.askEmail should get askLogin email', async () => {
    const userInfoUtil = new UserInfoUtil()
    const config = TestHelper.getConfig()
    const email = 'jdoe@nowhere.com';
    CliffyTestHelper.inputResponse(email)

    await userInfoUtil.askEmail(config)

    assertEquals(userInfoUtil.userInfo.email, email)
    assertEquals(config.email, email)
})
Deno.test('UserInfoUtil.askEmail should have a default value', async () => {
    const userInfoUtil = new UserInfoUtil()
    const defaultEmail = 'jdoe'
    CliffyTestHelper.inputResponse("")
    const config = TestHelper.getConfig()
    const emailDomain = undefined

    const input = await userInfoUtil.askEmail(config, emailDomain, defaultEmail)

    assertEquals(input, defaultEmail)
})
