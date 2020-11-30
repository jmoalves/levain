import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import {assertStringEndsWith} from "../test/more_asserts.ts";
import CredentialsUtil from "./credentials_util.ts";

Deno.test('should use credentials file in $HOME/credentials_jdoe.yaml', () => {
    const credentials = new CredentialsUtil()
    assertStringEndsWith(credentials.credentialsFileUri, `/.levain.yaml`)
})

Deno.test('should load credentials', async () => {
    const credentialsUtil = new CredentialsUtil('./testData/home/credentials_jdoe.yaml')

    await credentialsUtil.load()

    assertEquals(credentialsUtil.credentials.login, 'jdoe')
    assertEquals(credentialsUtil.credentials.email, 'john.doe@organization.org')
    assertEquals(credentialsUtil.credentials.fullName, 'John Doe')
})

Deno.test('should work when credentials were not found', async () => {
    const credentialsUtil = new CredentialsUtil('./credentials_not_found')

    credentialsUtil.load()

    assertEquals(credentialsUtil.credentials.login, '')
    assertEquals(credentialsUtil.credentials.email, '')
    assertEquals(credentialsUtil.credentials.fullName, '')
})