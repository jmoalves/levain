import * as log from "@std/log";

import { delay } from "@std/async/delay";

// https://github.com/caspervonb/deno-prompts/blob/master/mod.ts
export function promptSecret(message: string): string | undefined {
  Deno.stdout.writeSync(new TextEncoder().encode(message));

  const isTty = Deno.stdin.isTerminal();
  if (isTty) {
    Deno.stdin.setRaw(true);
  }

  const decoder = new TextDecoder();
  let input = "";
  try {
    while (true) {
      const data = new Uint8Array(1);
      const nread = Deno.stdin.readSync(data);
      if (!nread) {
        return input.length > 0 ? input : undefined;
      }

      const decoded = decoder.decode(data.subarray(0, nread), { stream: true });
      for (const char of decoded) {
        switch (char) {
          case "\u0003":
          case "\u0004":
            return undefined;

          case "\r":
          case "\n":
            return input + decoder.decode();

          case "\u0008":
          case "\u007f":
            input = [...input].slice(0, -1).join("");
            break;

          default:
            input += char;
            break;
        }
      }
    }
  } finally {
    if (isTty) {
      Deno.stdin.setRaw(false);
    }
  }
}

export function envChain(...names: string[]): string | undefined {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) {
      return value;
    }
  }

  return undefined;
}

export async function retry(maxAttempts: number, codeToRun: () => void, sleepAmountMax: number = 5): Promise<void> {
  let lastError = undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      codeToRun();
      return;
    } catch (error) {
      log.warn(`RETRY - Ignoring ${error}`);
      lastError = error;
      if (attempt < maxAttempts) {
        await sleepRandomAmountOfSeconds(0, Math.max(1, sleepAmountMax));
      }
    }
  }

  throw lastError;
}

export async function sleepRandomAmountOfSeconds(
  minSeconds: number,
  maxSeconds: number,
): Promise<void> {
  const milliseconds =
    (Math.random() * (maxSeconds - minSeconds) + minSeconds) * 1000;

  await delay(milliseconds);
}
