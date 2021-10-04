import {EmailValidator} from "./validators/validators.ts";
import {Input} from 'https://deno.land/x/cliffy/prompt/input.ts'

export class InputEmail {

    static async inputAndValidate(defaultValue: string): Promise<string> {
        return await Input.prompt({
                message: "Do you have an EMAIL? (press return to confirm default value)",
                default: defaultValue,
                validate: EmailValidator.validate,
            }
        )
    }

}
