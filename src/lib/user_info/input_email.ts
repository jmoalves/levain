import {EmailValidator} from "./validators/validators.ts";

export class InputEmail {

    static inputAndValidateSync(defaultValue: string) {
        let newValue: string
        let validationResult: ValidationResult

        do {
            if (validationResult) {
                console.log(validationResult)
            }
            let message = "Do you have an EMAIL?"
            if (defaultValue) {
                message += ` Press return for` // [${defaultValue}]`
            }
            newValue = prompt(message, defaultValue)

            validationResult = EmailValidator.validate(newValue)
        } while (validationResult !== true)

        return newValue
    }
}
