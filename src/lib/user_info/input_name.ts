import {NameValidator} from "./validators/validators.ts"
import {Input} from 'https://deno.land/x/cliffy/prompt/input.ts'
import {readLines} from 'https://deno.land/std/io/mod.ts'
import OsUtils from "../os/os_utils.ts";
import {ValidateResult} from "https://deno.land/x/cliffy/prompt/_generic_prompt.ts";

import t from '../i18n.ts'

export class InputFullName {

    static readonly defaultMessage = t("lib.user_info.input_name.namePrompt");

    static async inputAndValidate(defaultValue: string): Promise<string> {

        return await Input.prompt({
                message: this.defaultMessage,
                default: defaultValue,
                validate: NameValidator.validate,
            }
        )
    }

    static async inputAndValidateWithEncoding(defaultValue: string): Promise<string> {
        let fullName: string
        let validateResult: ValidateResult = false

        do {
            if (validateResult) {
                console.log(validateResult)
            }
            fullName = await InputFullName.promptWithEncoding(this.defaultMessage, defaultValue)

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
            message += t("lib.user_info.input_name.enterDefault", { defaultValue: defaultValue })
        }

        if (!encoding) {
            if (OsUtils.isWindows()) {
                encoding = 'latin1'
            } else {
                encoding = 'utf8'
            }
        }

        console.log(message)

        const {value} = await readLines(Deno.stdin, {encoding}).next()
        return <string>value || defaultValue
    }
}
