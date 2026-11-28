import { promptLine } from "./line_prompt.ts";
import { EmailValidator } from "./validators/validators.ts";

import t from "../i18n.ts";

export class InputEmail {
  static inputAndValidate(defaultValue: string): Promise<string> {
    return Promise.resolve(
      promptLine({
        message: t("lib.user_info.input_email.emailPrompt"),
        defaultValue,
        validate: EmailValidator.validate,
      }),
    );
  }
}
