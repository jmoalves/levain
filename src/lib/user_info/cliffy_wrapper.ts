// CLIFFY STUB - Remove after fixing
const Input = { prompt: async (opts: any) => opts.default || "" };
const Select = { prompt: async (opts: any) => opts.options?.[0] || "" };
const Confirm = { prompt: async (opts: any) => false };
const Command = class Command {
  parse() {}
};

/**
 * Cliffy Wrapper - Simplified version
 * Using stable Cliffy version
 */

// Re-export from stable Cliffy version
export { Input } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";
export { Select } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";
export { Confirm } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";
export { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

// Type exports if needed
export type { InputOptions } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";
export type { SelectOptions } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";
