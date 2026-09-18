import type { Closer, Reader } from "@std/io";

import type RewindReader from "../io/rewind_reader.ts";
import type Timestamps from "../io/timestamps.ts";
import type Progress from "../io/progress.ts";

export default interface ProgressReader extends Reader, Progress, RewindReader, Timestamps, Closer {
  readonly name: string;
}
