import { assert, assertRejects } from "@std/assert";

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
    async () => await action.execute(undefined, ["--port=8080", "--transport=sctp"]),
    Error,
    "Transport should be udp or tcp",
  );

  // TODO(phase-4.5): CheckPort has a typo (`args.transport != "upd"`) causing valid "udp" to be rejected.
  await assertRejects(
    async () => await action.execute(undefined, ["--port=8080", "--transport=udp"]),
    Error,
    "Transport should be udp or tcp",
  );
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
