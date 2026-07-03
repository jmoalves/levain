import RewindReader from "../io/rewind_reader.ts";
import Timestamps from "../io/timestamps.ts";
import Progress from "../io/progress.ts";

import type { Closer, Reader } from "https://deno.land/x/std/io/types.ts";

export default interface ProgressReader extends Reader, Progress, RewindReader, Timestamps, Closer {
  readonly name: string;
}
