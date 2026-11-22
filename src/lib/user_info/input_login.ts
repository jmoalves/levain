import { LoginValidator } from "./validators/validators.ts";
import { Input } from '@cliffy/prompt';

import t from "../i18n.ts";

export class InputLogin {
  private static readonly message = t("lib.user_info.input_login.loginPrompt");

  static async inputAndValidate(defaultValue: string = ""): Promise<string> {
    return await Input.prompt({
      message: this.message,
      default: defaultValue,
      validate: LoginValidator.validate,
    });
  }
}
