import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import CheckPort from "./check_port.ts";

Deno.test("CheckPort should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("checkPort", TestHelper.getConfig());
  assert(action instanceof CheckPort);
});

Deno.test("CheckPort should require --port and validate --transport", async () => {
  const action = new CheckPort(TestHelper.getConfig());

  await assertRejects(
    async () => await action.execute(undefined, []),
    Error,
    "You must inform the port to check",
  );

  await assertRejects(
    async () => await action.execute(undefined, ["--port=notanumber"]),
    Error,
    "Invalid port number: notanumber",
  );

  await assertRejects(
    async () => await action.execute(undefined, ["--port=   "]),
    Error,
    "Invalid port number",
  );

  await assertRejects(
    async () => await action.execute(undefined, ["--port=0x50"]),
    Error,
    "Invalid port number: 0x50",
  );

  await assertRejects(
    async () => await action.execute(undefined, ["--port=70000"]),
    Error,
    "Invalid port number: 70000",
  );

  await assertRejects(
    async () => await action.execute(undefined, ["--port=8080", "--transport=sctp"]),
    Error,
    "Transport should be udp or tcp",
  );
});

Deno.test("CheckPort should handle --transport=udp without rejecting transport name", async () => {
  const action = new CheckPort(TestHelper.getConfig());
  const hasListenDatagram = typeof (Deno as unknown as { listenDatagram?: unknown }).listenDatagram === "function";

  if (hasListenDatagram) {
    await action.execute(undefined, ["--port=0", "--transport=udp", "--address=127.0.0.1"]);
  } else {
    await assertRejects(
      async () => await action.execute(undefined, ["--port=0", "--transport=udp", "--address=127.0.0.1"]),
      Error,
      "UDP port checking requires Deno unstable-net",
    );
  }
});

Deno.test("CheckPort should exercise listenDatagram success, AddrInUse, and error rethrow when available", async () => {
  const action = new CheckPort(TestHelper.getConfig());
  const denoObj = Deno as unknown as Record<string, unknown>;
  const hadProp = Object.hasOwn(denoObj, "listenDatagram");
  const original = denoObj.listenDatagram;

  try {
    let closed = false;
    denoObj.listenDatagram = () => ({
      close: () => {
        closed = true;
      },
    });
    await action.execute(undefined, ["--port=5353", "--transport=udp", "--address=127.0.0.1"]);
    assertEquals(closed, true);

    denoObj.listenDatagram = () => {
      throw new Deno.errors.AddrInUse("udp busy");
    };
    await assertRejects(
      async () => await action.execute(undefined, ["--port=5353", "--transport=udp"]),
      Error,
      "Port already in use",
    );

    denoObj.listenDatagram = () => {
      throw new Deno.errors.PermissionDenied("denied");
    };
    await assertRejects(
      async () => await action.execute(undefined, ["--port=5353", "--transport=udp"]),
      Deno.errors.PermissionDenied,
      "denied",
    );
  } finally {
    if (hadProp) {
      denoObj.listenDatagram = original;
    } else {
      delete denoObj.listenDatagram;
    }
  }
});

Deno.test("CheckPort should rethrow non-AddrInUse errors from Deno.listen", async () => {
  const action = new CheckPort(TestHelper.getConfig());
  const listenStub = stub(Deno, "listen", () => {
    throw new Deno.errors.PermissionDenied("tcp denied");
  });

  try {
    await assertRejects(
      async () => await action.execute(undefined, ["--port=8080", "--transport=tcp"]),
      Deno.errors.PermissionDenied,
      "tcp denied",
    );
  } finally {
    listenStub.restore();
  }
});

Deno.test("CheckPort should succeed for a free port and reject when port is in use", async () => {
  const action = new CheckPort(TestHelper.getConfig());

  // Ephemeral port 0 succeeds cleanly with explicit tcp transport and loopback address
  await action.execute(undefined, ["--port=0", "--transport=tcp", "--address=127.0.0.1"]);

  // Occupy a local port and verify CheckPort fails
  const listener = Deno.listen({ port: 0, hostname: "127.0.0.1" });
  try {
    const addr = listener.addr as Deno.NetAddr;
    await assertRejects(
      async () =>
        await action.execute(undefined, [
          `--port=${addr.port}`,
          "--transport=tcp",
          "--address=127.0.0.1",
        ]),
      Error,
      "Port already in use",
    );
  } finally {
    listener.close();
  }
});
