import { ValidateResult } from "@cliffy/prompt";

export interface Validator {
  validate(text: string): ValidateResult;
}
