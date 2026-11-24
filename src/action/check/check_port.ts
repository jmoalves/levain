import * as log from "@std/log";

import type Config from "../../lib/config.ts";
import type Package from "../../lib/package/package.ts";
import { parseArgs } from "../../lib/parse_args.ts";

import type Action from "../action.ts";

export default class CheckPort implements Action {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package | undefined, parameters: string[]): Promise<void> {
    const args = parseArgs(parameters, {
      stringOnce: [
        "port",
        "transport",
        "address",
      ],
      stopEarly: false,
    });

    if (!args.port) {
      throw new Error("You must inform the port to check");
    }

    if (!/^\d+$/.test(args.port)) {
      throw new Error(`Invalid port number: ${args.port}`);
    }
    const port = Number(args.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      throw new Error(`Invalid port number: ${args.port}`);
    }

    const transport = args.transport ? args.transport.toLowerCase() : "tcp";
    if (transport !== "udp" && transport !== "tcp") {
      throw new Error("Transport should be udp or tcp");
    }

    const options: { port: number; transport: "tcp" | "udp"; hostname?: string } = {
      port,
      transport,
      ...(args.address ? { hostname: args.address } : {}),
    };

    log.debug(`CHECK-PORT ${JSON.stringify(options)}`);

    if (transport === "udp") {
      const listenDatagram = (Deno as unknown as {
        listenDatagram?: (opts: { port: number; transport: "udp"; hostname?: string }) => { close(): void };
      }).listenDatagram;
      if (typeof listenDatagram !== "function") {
        throw new Error("UDP port checking requires Deno unstable-net (Deno.listenDatagram); use --transport=tcp");
      }
      try {
        const listener = listenDatagram({
          port: options.port,
          transport: "udp",
          ...(options.hostname ? { hostname: options.hostname } : {}),
        });
        listener.close();
      } catch (error) {
        if (error instanceof Deno.errors.AddrInUse) {
          throw new Error(`Port already in use ${JSON.stringify(options)}`);
        }
        throw error;
      }
      return;
    }

    try {
      const listener = Deno.listen({
        port: options.port,
        transport: "tcp",
        ...(options.hostname ? { hostname: options.hostname } : {}),
      });
      listener.close();
    } catch (error) {
      if (error instanceof Deno.errors.AddrInUse) {
        throw new Error(`Port already in use ${JSON.stringify(options)}`);
      }
      throw error;
    }
  }
}
