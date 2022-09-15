import {Input} from 'https://deno.land/x/cliffy@v0.24.2/prompt/mod.ts'
import {NameValidator} from "../validators/validators.ts";
import {Validator} from "../validators/validator.ts";

let nameCliffy: string | undefined = undefined
const validateName: Validator = new NameValidator()

while (true) {

    nameCliffy = await Input.prompt({
        message: "What's your github user name?",
        default: nameCliffy,
        // minLength: 3, // disabled by validate in Cliffy 0.19.5
        validate: validateName.validate,
    })

    const encodedCliffyName: Uint8Array = new TextEncoder().encode(nameCliffy)

    function validateNameCliffy(text: string) {
        if (text.length < 3) {
            return `Value must be longer then 3 but has a length of ${text.length}.`
        }

        const latinUnicodeRegex = /^[0-9a-zA-Z\u00C0-\u00FF ]+$/i
        const hint = "Only valid characters, please";
        if (!latinUnicodeRegex.test(text)) {
            return hint
        }

        return true
    }

    const valid = validateName.validate(nameCliffy)
    console.log(`nameCliffy: ${nameCliffy} ${encodedCliffyName}`)
    console.log(`valid: ${valid}`)
}
