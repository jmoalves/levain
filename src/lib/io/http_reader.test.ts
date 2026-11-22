import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import * as path from "@std/path";

import HttpReader from "./http_reader.ts";
import { FileProgress } from "./file_progress.ts";
import HttpUtils from "../utils/http_utils.ts";
import TestHelper from "../test/test_helper.ts";

Deno.test("HttpReader.rewind should read body on HTTP 200 and close cleanly", async () => {
  const payload = "hello-http-reader";
  const getStub = stub(
    HttpUtils,
    "get",
    () =>
      Promise.resolve(
        new Response(payload, {
          status: 200,
          headers: {
            "content-length": String(payload.length),
            "last-modified": "Wed, 21 Oct 2015 07:28:00 GMT",
          },
        }),
      ),
  );

  const reader = new HttpReader("https://example.org/file.txt");
  try {
    await reader.rewind();
    assertEquals(reader.size, payload.length);
    assertEquals(reader.motificationTime?.toUTCString(), "Wed, 21 Oct 2015 07:28:00 GMT");

    const buf = new Uint8Array(64);
    const n = await reader.read(buf);
    assertEquals(n, payload.length);
    assertEquals(new TextDecoder().decode(buf.subarray(0, n ?? 0)), payload);
    assertEquals(await reader.read(buf), null);
  } finally {
    await reader.close();
    getStub.restore();
  }
});

Deno.test("HttpReader.rewind should reject non-OK HTTP responses (404/500) without caching error body", async () => {
  const getStub = stub(
    HttpUtils,
    "get",
    (url: string) => {
      if (url.endsWith("404")) {
        return Promise.resolve(new Response("<html>404 Not Found</html>", { status: 404 }));
      }
      return Promise.resolve(new Response("<html>500 Server Error</html>", { status: 500 }));
    },
  );

  try {
    const reader404 = new HttpReader("https://example.org/404");
    await assertRejects(() => reader404.rewind(), Error, "HTTP 404");

    const reader500 = new HttpReader("https://example.org/500");
    await assertRejects(() => reader500.rewind(), Error, "HTTP 500");
  } finally {
    getStub.restore();
  }
});

Deno.test("HttpReader + FileProgress retries cleanly when first stream fails mid-read", async () => {
  const payload = "recovered-payload";
  let attempt = 0;
  const getStub = stub(
    HttpUtils,
    "get",
    () => {
      attempt++;
      if (attempt === 1) {
        const failingStream = new ReadableStream<Uint8Array>({
          pull(controller) {
            controller.error(new Error("transient network drop"));
          },
        });
        return Promise.resolve(
          new Response(failingStream, {
            status: 200,
            headers: { "content-length": String(payload.length) },
          }),
        );
      }
      return Promise.resolve(
        new Response(payload, {
          status: 200,
          headers: { "content-length": String(payload.length) },
        }),
      );
    },
  );

  const reader = new HttpReader("https://example.org/flaky.bin");
  const dstFile = path.join(TestHelper.getNewTempDir(), "flaky.bin");
  try {
    await reader.rewind();
    await FileProgress.copyWithProgress(reader, dstFile, true);
    assertEquals(attempt, 2);
    assertEquals(Deno.readTextFileSync(dstFile), payload);
  } finally {
    await reader.close();
    getStub.restore();
  }
});
