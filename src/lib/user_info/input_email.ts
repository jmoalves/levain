import {EmailValidator} from "./validators/validators.ts";
import {ValidateResult} from "https://deno.land/x/cliffy/prompt/_generic_prompt.ts";

export class InputEmail {

    static inputAndValidateSync(defaultValue: string): string {
        let newValue: string
        let validateResult: ValidateResult = false

        do {
            if (validateResult) {
                console.log(validateResult)
            }
            let message = "Do you have an EMAIL?"
            if (defaultValue) {
                message += ` Press return for` // [${defaultValue}]`
            }
            newValue = prompt(message, defaultValue) || ''

            validateResult = EmailValidator.validate(newValue)
        } while (validateResult !== true)

        return newValue
    }
}
