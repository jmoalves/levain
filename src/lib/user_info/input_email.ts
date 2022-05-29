import {EmailValidator} from "./validators/validators.ts";
import {Input} from 'https://deno.land/x/cliffy/prompt/input.ts'

import t from '../i18n.ts'

export class InputEmail {

    static async inputAndValidate(defaultValue: string): Promise<string> {
        return await Input.prompt({
                message: t("lib.user_info.input_email.emailPrompt"),
                default: defaultValue,
                validate: EmailValidator.validate,
            }
        )
    }

}
