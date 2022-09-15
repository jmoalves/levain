import {ValidateResult} from 'https://deno.land/x/cliffy/prompt/mod.ts'

export interface Validator {
    validate(text: string): ValidateResult
}
