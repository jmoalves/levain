import {NameValidator} from "./validators/validators.ts"
import {Input} from 'https://deno.land/x/cliffy/prompt/mod.ts'

import t from '../i18n.ts'

export class InputFullName {

    static readonly defaultMessage = t("lib.user_info.input_name.namePrompt");

    static async askUser(defaultValue: string): Promise<string> {
        let fullName: string
        return await Input.prompt({
            message: this.defaultMessage,
            default: defaultValue,
            validate: NameValidator.validate,
        })
    }
}
