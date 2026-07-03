/**
 * Alternative implementation for accent input without Cliffy
 * Uses native Deno prompt
 */

import * as path from "jsr:@std/path@1.0.0";

export async function inputNomeComAcentos(message: string = "Digite o nome:"): Promise<string> {
  // Use native prompt - it handles accents fine in most terminals
  const name = prompt(message);

  if (!name) {
    return "";
  }

  // Save for debugging if needed
  const myFolder = Deno.makeTempDirSync();
  await Deno.writeTextFile(path.join(myFolder, "nome.txt"), name);

  const encoder = new TextEncoder();
  const encodedName = encoder.encode(name);
  await Deno.writeFile(path.join(myFolder, "nome.encoded.txt"), encodedName);

  return name;
}

// Simple Input replacement
export class Input {
  // deno-lint-ignore require-await
  static async prompt(config: { message: string; default?: string }): Promise<string> {
    const message = config.default ? `${config.message} [${config.default}]` : config.message;

    const result = prompt(message);
    return result || config.default || "";
  }
}
