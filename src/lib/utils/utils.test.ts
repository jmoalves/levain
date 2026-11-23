import { assertEquals } from "@std/assert";
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
