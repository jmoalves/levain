import {NameValidator} from "./validators/validators.ts"
import {Input} from 'https://deno.land/x/cliffy/prompt/input.ts'
import {readLines} from 'https://deno.land/std/io/mod.ts'
import OsUtils from "../os/os_utils.ts";
import {ValidateResult} from "https://deno.land/x/cliffy/prompt/_generic_prompt.ts";

export class InputFullName {

    static inputAndValidateSync(defaultValue: string): string {
        let newValue: string
        let validateResult: ValidateResult = false

        do {
            if (validateResult) {
                console.log(validateResult)
            }
            let message = "What's your FULL NAME for Git and other configs?"
            newValue = prompt(message, defaultValue) || ''

            validateResult = NameValidator.validate(newValue)
        } while (validateResult !== true)

        return newValue;
    }

    static async inputAndValidate(defaultValue: string): Promise<string> {

        const fullName: string = await Input.prompt({
                message: "What's your FULL NAME for Git and other configs?",
                default: defaultValue,
                validate: NameValidator.validate,
            }
        )

        return fullName
    }

    static async inputAndValidateWithEncoding(defaultValue: string): Promise<string> {
        let fullName: string
        let validateResult: ValidateResult = false

        do {
            if (validateResult) {
                console.log(validateResult)
            }
            let message = "What's your FULL NAME for Git and other configs?"
            fullName = await InputFullName.promptWithEncoding(message, defaultValue)

            validateResult = NameValidator.validate(fullName)
        } while (validateResult !== true)

        return fullName;
    }

    static async promptWithEncoding(
        message: string,
        defaultValue: string = '',
        encoding: string = 'utf8',
    ): Promise<string> {
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
