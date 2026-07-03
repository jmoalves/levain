import type { Reader } from "@std/io";

export default interface RewindReader extends Reader {
  rewind(): void;
}
