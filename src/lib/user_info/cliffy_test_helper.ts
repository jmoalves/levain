import {Input,} from "https://deno.land/x/cliffy/prompt/mod.ts";

export class CliffyTestHelper {
    static inputResponse(value: string = '') {
        Input.inject(value)
    }
}
