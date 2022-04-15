import {EmailValidator, LatinUnicodeValidator, LoginValidator, MinLengthValidator, NameValidator} from "./validators.ts"
import {assertEquals} from "https://deno.land/std/testing/asserts.ts"

//
// MinLengthValidator
//
Deno.test('MinLengthValidator should validate expected length', () => {
    const validator = new MinLengthValidator(3)
    assertEquals(validator.validate('123'), true)
})
Deno.test('MinLengthValidator should reject when below expected length', () => {
    const validator = new MinLengthValidator(4)
    assertEquals(validator.validate('123'), "Length must be at least 4 but is 3.")
})
//
// LatinUnicodeValidator
//
Deno.test('LatinUnicodeValidator should validate latin chars', () => {
    const validator = new LatinUnicodeValidator()
    assertEquals(validator.validate("123abcABCãêçÁ .-'"), true)
})
Deno.test('LatinUnicodeValidator should validate an empty string', () => {
    const validator = new LatinUnicodeValidator()
    assertEquals(validator.validate(''), true)
})
Deno.test('LatinUnicodeValidator should reject unexpected chars', () => {
    const validator = new LatinUnicodeValidator()
    const invalidDenoPromptChar = '�'; // https://github.com/denoland/deno/issues/8239#issuecomment-901448362
    assertEquals(validator.validate(invalidDenoPromptChar), "Only valid characters, please")
})
//
// NameValidator
//
Deno.test('NameValidator should validate an ASCII name', () => {
    const validator = new NameValidator()
    assertEquals(validator.validate('John'), true)
})
Deno.test('NameValidator should validate names with accents', () => {
    const validator = new NameValidator()
    assertEquals(validator.validate('João'), true)
})
Deno.test('NameValidator should reject 2 chars', () => {
    const validator = new NameValidator()
    assertEquals(validator.validate('Oz'), "Length must be at least 3 but is 2.")
})
Deno.test('NameValidator should reject unexpected chars', () => {
    const validator = new NameValidator()
    const invalidDenoPromptChar = 'abc�123'; // https://github.com/denoland/deno/issues/8239#issuecomment-901448362
    assertEquals(validator.validate(invalidDenoPromptChar), "Only valid characters, please")
})
Deno.test('NameValidator should have a static validator', () => {
    assertEquals(NameValidator.validate('Mary'), true)
})
//
// EmailValidator
//
Deno.test('EmailValidator should accept a valid email', () => {
    const validator = new EmailValidator()
    assertEquals(validator.validate('john.doe@myprovider123.com'), true)
})
Deno.test('EmailValidator should reject an ASCII name', () => {
    const validator = new EmailValidator()
    assertEquals(validator.validate('John'), 'Please inform a valid EMAIL')
})
Deno.test('EmailValidator should have a static validator', () => {
    assertEquals(EmailValidator.validate('mary@hadalittlelamb.org'), true)
})
//
// LoginValidator
//

Deno.test('LoginValidator should accept a valid login', () => {
    const validator = new LoginValidator()
    assertEquals(validator.validate('afo'), true)
    assertEquals(validator.validate('rfwal'), true)
    assertEquals(validator.validate('t2765'), true)
    assertEquals(validator.validate('321'), true)
    assertEquals(validator.validate('54321'), true)
})
Deno.test('LoginValidator should reject invalid logins', () => {
    const validator = new LoginValidator()
    const invalidLoginMessage = 'Please inform a valid LOGIN'
    assertEquals(validator.validate('false with spaces'), invalidLoginMessage)
    assertEquals(validator.validate(''), invalidLoginMessage)
    assertEquals(validator.validate('1'), invalidLoginMessage)
    assertEquals(validator.validate('21'), invalidLoginMessage)
    assertEquals(validator.validate('654321'), invalidLoginMessage)
})
Deno.test('LoginValidator should have a static validator', () => {
    assertEquals(LoginValidator.validate('rfwal'), true)
})
