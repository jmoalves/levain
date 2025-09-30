// CLIFFY STUB - Remove after fixing
const Input = { prompt: async (opts: any) => opts.default || "" };
const Select = { prompt: async (opts: any) => opts.options?.[0] || "" };
const Confirm = { prompt: async (opts: any) => false };
const Command = class Command {
  parse() {}
};

import { EmailValidator } from "./validators/validators.ts";
// TEMP DISABLED: import {Input} from 'https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts'

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
