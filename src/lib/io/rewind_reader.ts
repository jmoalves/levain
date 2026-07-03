import type { Reader } from "https://deno.land/x/std/io/types.ts";

export default interface RewindReader extends Reader {
  rewind(): void;
}
