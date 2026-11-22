import { assert, assertNotEquals } from "@std/assert";

import { Timer } from "./timer.ts";

Deno.test("should measure elapsed time", () => {
  const timer = new Timer();

  const firstMeasure: number = timer.measure();
  assert(firstMeasure > 0, "firstMeasure should be greater then 0");

  assert(
    timer.measure() > firstMeasure,
    "secondMeasure should be greater then first measure. Great Scott! Do you have a DeLorean?!?",
  );
});

Deno.test("should humanize measures", () => {
  const timer = new Timer();

  assertNotEquals(timer.humanize(), undefined);
});

Deno.test("should reset startTime when reset is called", () => {
  const timer = new Timer();
  timer.startTime = performance.now() - 5000;
  assert(timer.measure() >= 4900, "measure() should reflect elapsed time since startTime");

  timer.reset();
  assert(timer.measure() < 1000, "reset() should restart startTime near now");
});
