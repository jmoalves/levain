import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import { promptSecret, retry } from "./utils.ts";

Deno.test("retry", async () => {
  const startTime = performance.now();
  const retries = 2;
  const attempts = retries + 1;
  const runner = new FailFixedCount(retries);
  await retry(attempts, () => {
    runner.run();
  });
  const endTime = performance.now();

  assertEquals(attempts, runner.amount);

  console.log(`Test took ${endTime - startTime}ms`);
});

class FailFixedCount {
  public amount: number = 0;

  constructor(private failAmount: number) {}
  run() {
    this.amount++;
    if (this.amount <= this.failAmount) {
      throw `${this.amount} - Abort`;
    }
  }
}

Deno.test("promptSecret should decode multi-byte UTF-8, handle DEL/BS backspaces, and restore raw mode", () => {
  // Input bytes: "sê" + "x" + DEL (0x7f) + "ç" + "y" + BS (0x08) + "\n"
  const prefix = new TextEncoder().encode("sêx");
  const mid = new TextEncoder().encode("çy");
  const payload = new Uint8Array([...prefix, 0x7f, ...mid, 0x08, 0x0a]);
  let pos = 0;
  const rawCalls: boolean[] = [];

  const writeStub = stub(Deno.stdout, "writeSync", (p: Uint8Array) => p.length);
  const ttyStub = stub(Deno.stdin, "isTerminal", () => true);
  const rawStub = stub(Deno.stdin, "setRaw", (mode: boolean) => {
    rawCalls.push(mode);
  });
  const readStub = stub(Deno.stdin, "readSync", (buf: Uint8Array) => {
    if (pos >= payload.length) return null;
    buf[0] = payload[pos++];
    return 1;
  });

  try {
    const result = promptSecret("pw: ");
    assertEquals(result, "sêç");
    assertEquals(rawCalls, [true, false]);
  } finally {
    readStub.restore();
    rawStub.restore();
    ttyStub.restore();
    writeStub.restore();
  }
});

Deno.test("promptSecret handles EOF, Ctrl+C, Ctrl+D, and CR", () => {
  const cases: Array<{ bytes: number[]; expected: string | undefined }> = [
    { bytes: [], expected: undefined }, // immediate EOF
    { bytes: [0x61, 0x62], expected: "ab" }, // EOF with buffered text
    { bytes: [0x61, 0x03], expected: undefined }, // Ctrl+C
    { bytes: [0x61, 0x04], expected: undefined }, // Ctrl+D
    { bytes: [0x6f, 0x6b, 0x0d], expected: "ok" }, // CR
  ];

  const writeStub = stub(Deno.stdout, "writeSync", (p: Uint8Array) => p.length);
  const ttyStub = stub(Deno.stdin, "isTerminal", () => false);
  try {
    for (const tc of cases) {
      let pos = 0;
      const readStub = stub(Deno.stdin, "readSync", (buf: Uint8Array) => {
        if (pos >= tc.bytes.length) return null;
        buf[0] = tc.bytes[pos++];
        return 1;
      });
      try {
        assertEquals(promptSecret("pw: "), tc.expected);
      } finally {
        readStub.restore();
      }
    }
  } finally {
    ttyStub.restore();
    writeStub.restore();
  }
});

Deno.test("retry rethrows last error after exhausting maxAttempts", async () => {
  await assertRejects(
    () =>
      retry(1, () => {
        throw new Error("always fails");
      }, 0),
    Error,
    "always fails",
  );
});
