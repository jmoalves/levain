/**
 * Alternative implementation without Cliffy
 * Uses native Deno prompt instead
 */

export async function validateInput(message: string): Promise<string> {
  // Use Deno's built-in prompt instead of Cliffy
  const input = prompt(message);
  return input || "";
}

export async function validateInputWithDefault(message: string, defaultValue: string): Promise<string> {
  const input = prompt(`${message} [${defaultValue}]`);
  return input || defaultValue;
}
