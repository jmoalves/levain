import {ValidateResult} from "https://deno.land/x/cliffy/prompt/_generic_prompt.ts";
import {Validator} from "./validator.ts";

export class MinLengthValidator implements Validator {
    constructor(public minLength: number) {
    }

    validate(text: string): ValidateResult {
        if (text?.length < this.minLength) {
            return `Length must be at least ${this.minLength} but is ${text?.length}.`
        }
        return true
    }
}

export class LatinUnicodeValidator implements Validator {
    readonly latinUnicodeRegex = /^[0-9a-zA-Z\u00C0-\u00FF ]*$/i

    validate(text: string): ValidateResult {
        const hint = "Only valid characters, please";
        if (!this.latinUnicodeRegex.test(text)) {
            return hint
        }
        return true
    }
}

export class NameValidator implements Validator {
    validate(text: string): ValidateResult {

        const validators: Validator[] = [
            new LatinUnicodeValidator(),
            new MinLengthValidator(3),
        ]

        const compositeValidators = new CompositeValidators(validators)
        return compositeValidators.validate(text)
    }

    static readonly validator = new NameValidator()

    static validate(text: string): ValidateResult {
        return this.validator.validate(text)
    }
}

export class CompositeValidators implements Validator {
    constructor(public validators: Validator[]) {
    }

    validate(text: string): ValidateResult {

        for (const validator of this.validators) {
            const validationResult = validator.validate(text)
            if (validationResult !== true) {
                return validationResult
            }
        }

        return true
    }
}

export class EmailValidator implements Validator {

    readonly emailRegex = /^\w+@\w+\.[\w.]+$/

    validate(text: string): ValidateResult {

        if (!this.emailRegex.test(text)) {
            return 'Please inform a valid email address'
        }

        return true
    }
}
