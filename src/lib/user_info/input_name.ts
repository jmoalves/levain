import { Input } from '@cliffy/prompt';
import { NameValidator } from "./validators/validators.ts";

import t from "../i18n.ts";

export class InputFullName {
  static readonly defaultMessage = t("lib.user_info.input_name.namePrompt");

  static async inputAndValidate(defaultValue: string): Promise<string> {
    return await Input.prompt({
      message: this.defaultMessage,
      default: defaultValue,
      validate: NameValidator.validate,
    });
  }
}
