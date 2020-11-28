import Credentials from "./credentials.ts";
import {assertStringEndsWith} from "./test/more_asserts.ts";

Deno.test('should use credentials file in $HOME/.levain.yaml', () => {
    const credentials = new Credentials()
    assertStringEndsWith(credentials.credentialsFileUri, `/.levain.yaml`)
})