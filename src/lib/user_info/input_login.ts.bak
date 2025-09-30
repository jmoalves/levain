import {LoginValidator} from "./validators/validators.ts"
import {ValidateResult,Input} from 'https://deno.land/x/cliffy/prompt/mod.ts'
import {readLines} from 'https://deno.land/std/io/mod.ts'
import OsUtils from "../os/os_utils.ts";

import t from '../i18n.ts'

export class InputLogin {

    private static readonly message = t("lib.user_info.input_login.loginPrompt");

    static async inputAndValidate(defaultValue: string = ''): Promise<string> {

        return await Input.prompt({
                message: this.message,
                default: defaultValue,
                validate: LoginValidator.validate,
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
            let message = t("lib.user_info.input_login.loginPromptShort")
            fullName = await InputLogin.promptWithEncoding(message, defaultValue)

            validateResult = LoginValidator.validate(fullName)
        } while (validateResult !== true)

        return fullName;
    }

    static async promptWithEncoding(
        message: string,
        defaultValue: string = '',
        encoding: string = 'utf8',
    ): Promise<string> {
        if (defaultValue) {
            message += t("lib.user_info.input_login.enterDefault", { defaultValue: defaultValue })
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
