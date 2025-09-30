// CLIFFY STUB - Remove after fixing
const Input = { prompt: async (opts: any) => opts.default || '' };
const Select = { prompt: async (opts: any) => opts.options?.[0] || '' };
const Confirm = { prompt: async (opts: any) => false };
const Command = class Command { parse() {} };

// TEMP DISABLED: import {ValidateResult} from 'https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts'

export interface Validator {
    validate(text: string): ValidateResult
}
