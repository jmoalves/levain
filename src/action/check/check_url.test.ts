import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import TestHelper from "../../lib/test/test_helper.ts";
import CheckUrl from "./check_url.ts";

Deno.test("CheckUrl should throw when URL is missing", async () => {
  const action = new CheckUrl(TestHelper.getConfig());
  await assertRejects(
    () => action.execute(TestHelper.mockPackage(), []),
    Error,
    "You must inform the URL to check",
  );
});

Deno.test("CheckUrl should succeed on HTTP 200 and cancel response body", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response(body, { status: 200 })),
  );

  try {
    const action = new CheckUrl(TestHelper.getConfig());
    await action.execute(TestHelper.mockPackage(), ["https://example.org/health"]);
    assertEquals(cancelled, true);
  } finally {
    fetchStub.restore();
  }
});

Deno.test("CheckUrl should reject on non-200 status and still cancel response body", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response(body, { status: 503 })),
  );

  try {
    const action = new CheckUrl(TestHelper.getConfig());
    await assertRejects(
      () => action.execute(TestHelper.mockPackage(), ["https://example.org/down"]),
      Error,
      "Invalid status - 503",
    );
    assertEquals(cancelled, true);
  } finally {
    fetchStub.restore();
  }
});
