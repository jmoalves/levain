import { assertEquals } from "@std/assert";

import { retry } from "./utils.ts";

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
