import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import {Powershell} from "./powershell.ts";

Deno.test({
    name: 'should run script',
    async fn() {
        const helloWorldScript = 'return \'Hello Powershell\'';
        const result = await Powershell.run(helloWorldScript)

        assertEquals(result, 'Hello Powershell')
    }
});

// should run file
