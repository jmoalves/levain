import type { ValidateResult } from "@cliffy/prompt";

export interface LinePromptOptions {
  message: string;
  defaultValue?: string;
  validate?: (value: string) => ValidateResult;
  normalize?: (value: string) => string;
  promptFn?: (message?: string, defaultValue?: string) => string | null;
}

let injectedValue: string | undefined;

export function injectLinePrompt(value: string): void {
  injectedValue = value;
}

/**
 * Line-buffered prompt backed by Deno's `globalThis.prompt`.
 *
 * Unlike raw-mode TUI prompts (`Deno.stdin.setRaw(true)`), `globalThis.prompt`
 * uses native OS line input (`ReadConsoleW` on Windows), which handles dead keys,
 * accented UTF-8 characters (e.g., á, ã, ç), and clipboard paste reliably even
 * under non-UTF-8 Windows console code pages (e.g., CP850).
 */
export function promptLine(options: LinePromptOptions): string {
  const readFn = options.promptFn ?? ((msg, def) => globalThis.prompt(msg, def));
  const fallback = options.defaultValue ?? "";
  const finalize = (raw: string): { value: string; usedDefault: boolean } => {
    const usedDefault = raw === "" && fallback !== "";
    const resolved = usedDefault ? fallback : raw;
    return {
      value: options.normalize ? options.normalize(resolved) : resolved,
      usedDefault,
    };
  };

  if (injectedValue !== undefined) {
    const { value, usedDefault } = finalize(injectedValue);
    injectedValue = undefined;
    if (!usedDefault) {
      const result = options.validate ? options.validate(value) : true;
      if (result !== true) {
        throw new Error(typeof result === "string" ? result : "Invalid input");
      }
    }
    return value;
  }

  while (true) {
    const raw = readFn(options.message, fallback || undefined);
    if (raw === null) {
      throw new Error("Input cancelled by user");
    }
    const { value, usedDefault } = finalize(raw.trim());
    if (usedDefault) {
      return value;
    }
    const result = options.validate ? options.validate(value) : true;
    if (result === true) {
      return value;
    }
    console.error(typeof result === "string" ? result : "Invalid input");
  }
}
