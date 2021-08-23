import {NameValidator} from "./validators/validators.ts"
import {Input} from 'https://deno.land/x/cliffy/prompt/input.ts'
import {readLines} from 'https://deno.land/std/io/mod.ts'
import OsUtils from "../os/os_utils.ts";

export class InputFullName {

    static inputAndValidateSync(defaultValue: string) {
        let fullName: string
        let validationResult: ValidationResult

        do {
            if (validationResult) {
                console.log(validationResult)
            }
            let message = "What's your FULL NAME for Git and other configs?"
            fullName = prompt(message, defaultValue)

            validationResult = NameValidator.validate(fullName)
        } while (validationResult !== true)

        return fullName;
    }

    static async inputAndValidate(defaultValue: string) {

        const fullName: string = await Input.prompt({
                message: "What's your FULL NAME for Git and other configs?",
                default: defaultValue,
                validate: NameValidator.validate,
            }
        )

        return fullName
    }

    static async inputAndValidateWithEncoding(defaultValue: string) {
        let fullName: string
        let validationResult: ValidationResult

        do {
            if (validationResult) {
                console.log(validationResult)
            }
            let message = "What's your FULL NAME for Git and other configs?"
            fullName = await InputFullName.promptWithEncoding(message, defaultValue)

            validationResult = NameValidator.validate(fullName)
        } while (validationResult !== true)

        return fullName;
    }

    static async promptWithEncoding(
        message: string,
        defaultValue: string = '',
        encoding,
    ): string {
        if (defaultValue) {
            message += ` Press return for [${defaultValue}]`
        }

        if (!encoding) {
            if (OsUtils.isWindows()) {
                encoding = 'latin1'
            } else {
                encoding = 'utf8'
            }
        }

        console.log(message)
        // FIXME should print "João"
        // await Deno.stdout.write(new TextEncoder().encode('João'))
        // await Deno.stdout.write(new TextEncoder().encode(message, encoding))

        const {value} = await readLines(Deno.stdin, {encoding}).next()
        return <string>value || defaultValue
    }
}
