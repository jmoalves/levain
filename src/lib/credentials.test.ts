import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import {assertStringEndsWith} from "./test/more_asserts.ts";
import {Credentials} from "./credentials.ts";

Deno.test('should use credentials file in $HOME/credentials_jdoe.yaml', () => {
    const credentials = new Credentials()
    assertStringEndsWith(credentials.credentialsFileUri, `/.levain.yaml`)
})

Deno.test('should load credentials', async () => {
    const credentials = new Credentials('./testData/home/credentials_jdoe.yaml')

    await credentials.load()

    assertEquals(credentials.login, 'jdoe')
    assertEquals(credentials.email, 'john.doe@organization.org')
    assertEquals(credentials.fullName, 'John Doe')
})

Deno.test('should work when credentials were not found', async () => {
    const credentials = new Credentials('./credentials_not_found')

    credentials.load()

    assertEquals(credentials.login, '')
    assertEquals(credentials.email, '')
    assertEquals(credentials.fullName, '')
})