import { assertEquals, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";

import { injectLinePrompt, promptLine } from "./line_prompt.ts";

Deno.test("promptLine accepts accented UTF-8 input, normalizes NFD to NFC, and applies defaults", () => {
  const result = promptLine({
    message: "Name:",
    defaultValue: "Default Name",
    normalize: (v) => v.normalize("NFC"),
    promptFn: () => "  Joa\u0303o Conceic\u0327a\u0303o  ",
  });
  assertEquals(result, "João Conceição");

  const withDefault = promptLine({
    message: "Name:",
    defaultValue: "José Silva",
    promptFn: () => "",
  });
  assertEquals(withDefault, "José Silva");
});

Deno.test("promptLine retries on validation failure until valid and throws on cancellation (null)", () => {
  const answers: Array<string | null> = ["x", "bad", "João"];
  const errors: string[] = [];
  const errStub = stub(console, "error", (...args: unknown[]) => errors.push(args.map(String).join(" ")));
  try {
    const result = promptLine({
      message: "Name:",
      validate: (v) => {
        if (v === "x") return "Too short";
        if (v === "bad") return false;
        return true;
      },
      promptFn: () => answers.shift() ?? null,
    });
    assertEquals(result, "João");
    assertEquals(errors, ["Too short", "Invalid input"]);
  } finally {
    errStub.restore();
  }

  assertThrows(
    () =>
      promptLine({
        message: "Name:",
        promptFn: () => null,
      }),
    Error,
    "Input cancelled by user",
  );
});

Deno.test("promptLine supports test injection and rejects invalid injected values", () => {
  injectLinePrompt("Conceição");
  assertEquals(
    promptLine({
      message: "Name:",
      validate: (v) => v.length >= 3 || "Too short",
    }),
    "Conceição",
  );

  injectLinePrompt("x");
  assertThrows(
    () =>
      promptLine({
        message: "Name:",
        validate: () => false,
      }),
    Error,
    "Invalid input",
  );

  const promptStub = stub(globalThis, "prompt", () => "José");
  try {
    assertEquals(promptLine({ message: "Name:" }), "José");
  } finally {
    promptStub.restore();
  }
});
