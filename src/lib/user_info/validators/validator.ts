import {ValidateResult} from "https://deno.land/x/cliffy/prompt/_generic_prompt.ts";

export interface Validator {
    validate(text: string): ValidateResult
}
