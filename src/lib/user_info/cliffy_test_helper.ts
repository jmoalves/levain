import {Input,} from "https://deno.land/x/cliffy@v0.24.2/prompt/mod.ts";

export class CliffyTestHelper {
    static inputResponse(value: string = '') {
        Input.inject(value)
    }
}
