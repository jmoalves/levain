import { Input } from '@cliffy/prompt';
import { EmailValidator } from "./validators/validators.ts";

import t from "../i18n.ts";

export class InputEmail {
  static async inputAndValidate(defaultValue: string): Promise<string> {
    return await Input.prompt({
      message: t("lib.user_info.input_email.emailPrompt"),
      default: defaultValue,
      validate: EmailValidator.validate,
    });
  }
}
