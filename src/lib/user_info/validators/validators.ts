import { ValidateResult } from "@cliffy/prompt";
import { type Validator } from "./validator.ts";

const EMAIL_REGEX = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

function isValidEmail(text: string): boolean {
  if (!text || text.length > 254) {
    return false;
  }
  const atIndex = text.indexOf("@");
  if (atIndex <= 0 || atIndex > 64 || text.includes("..") || text[0] === "." || text[atIndex - 1] === ".") {
    return false;
  }
  return EMAIL_REGEX.test(text);
}

export class MinLengthValidator implements Validator {
  constructor(public minLength: number) {
  }

  validate(text: string): ValidateResult {
    if (text?.length < this.minLength) {
      return `Length must be at least ${this.minLength} but is ${text?.length}.`;
    }
    return true;
  }
}

export class LatinUnicodeValidator implements Validator {
  readonly latinUnicodeRegex = /^[\w\u00C0-\u00FF \.\-']*$/i;

  validate(text: string): ValidateResult {
    const hint = "Only valid characters, please";
    if (!this.latinUnicodeRegex.test(text)) {
      return hint;
    }
    return true;
  }
}

export class NameValidator implements Validator {
  validate(text: string): ValidateResult {
    const validators: Validator[] = [
      new LatinUnicodeValidator(),
      new MinLengthValidator(3),
    ];

    const compositeValidators = new CompositeValidators(validators);
    return compositeValidators.validate(text);
  }

  static readonly validator = new NameValidator();

  static validate(text: string): ValidateResult {
    return NameValidator.validator.validate(text);
  }
}

export class CompositeValidators implements Validator {
  constructor(public validators: Validator[]) {
  }

  validate(text: string): ValidateResult {
    for (const validator of this.validators) {
      const validationResult = validator.validate(text);
      if (validationResult !== true) {
        return validationResult;
      }
    }

    return true;
  }
}

export class EmailValidator implements Validator {
  validate(text: string): ValidateResult {
    if (!isValidEmail(text)) {
      return "Please inform a valid EMAIL";
    }

    return true;
  }

  static readonly validator = new EmailValidator();

  static validate(text: string): ValidateResult {
    return EmailValidator.validator.validate(text);
  }
}

export class LoginValidator implements Validator {
  readonly regex = /^\w{3,5}$/;

  validate(text: string): ValidateResult {
    if (!this.regex.test(text)) {
      return "Please inform a valid LOGIN";
    }

    return true;
  }

  static readonly validator = new LoginValidator();

  static validate(text: string): ValidateResult {
    return LoginValidator.validator.validate(text);
  }
}
