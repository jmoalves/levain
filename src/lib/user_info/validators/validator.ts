import {ValidateResult} from 'https://deno.land/x/cliffy@v0.24.2/prompt/mod.ts'

export interface Validator {
    validate(text: string): ValidateResult
}
