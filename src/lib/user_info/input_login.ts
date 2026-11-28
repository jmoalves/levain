import { promptLine } from "./line_prompt.ts";
import { LoginValidator } from "./validators/validators.ts";

import t from "../i18n.ts";

export class InputLogin {
  private static readonly message = t("lib.user_info.input_login.loginPrompt");

  static inputAndValidate(defaultValue: string = ""): Promise<string> {
    return Promise.resolve(
      promptLine({
        message: this.message,
        defaultValue,
        validate: LoginValidator.validate,
      }),
    );
  }
}
