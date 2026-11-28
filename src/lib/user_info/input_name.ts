import { promptLine } from "./line_prompt.ts";
import { NameValidator } from "./validators/validators.ts";

import t from "../i18n.ts";

export class InputFullName {
  static readonly defaultMessage = t("lib.user_info.input_name.namePrompt");

  static inputAndValidate(defaultValue: string): Promise<string> {
    return Promise.resolve(
      promptLine({
        message: this.defaultMessage,
        defaultValue,
        normalize: (v) => v.normalize("NFC"),
        validate: NameValidator.validate,
      }),
    );
  }
}
