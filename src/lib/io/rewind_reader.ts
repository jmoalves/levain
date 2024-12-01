import type { Reader } from "jsr:@std/io/types";

export default interface RewindReader extends Reader {
    rewind(): void;
}
