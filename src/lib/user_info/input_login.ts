import {LoginValidator} from "./validators/validators.ts"
import {Input} from 'https://deno.land/x/cliffy/prompt/mod.ts'

import t from '../i18n.ts'

export class InputLogin {
    static async askUser(defaultValue: string): Promise<string> {
        let message = t("lib.user_info.input_login.loginPromptShort")

        if (defaultValue) {
            message += t("lib.user_info.input_login.enterDefault", { defaultValue: defaultValue })
        }

        return await Input.prompt({
            message: message,
            default: defaultValue,
            validate: LoginValidator.validate,
        })
    }
}
